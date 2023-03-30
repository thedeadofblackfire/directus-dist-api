"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const lodash_1 = require("lodash");
const _1 = __importDefault(require("."));
const helpers_1 = require("../database/helpers");
const env_1 = __importDefault(require("../env"));
const payload_1 = require("../services/payload");
const apply_function_to_column_name_1 = require("../utils/apply-function-to-column-name");
const apply_query_1 = __importStar(require("../utils/apply-query"));
const get_collection_from_alias_1 = require("../utils/get-collection-from-alias");
const get_column_1 = require("../utils/get-column");
const strip_function_1 = require("../utils/strip-function");
/**
 * Execute a given AST using Knex. Returns array of items based on requested AST.
 */
async function runAST(originalAST, schema, options) {
    const ast = (0, lodash_1.cloneDeep)(originalAST);
    const knex = options?.knex || (0, _1.default)();
    if (ast.type === 'a2o') {
        const results = {};
        for (const collection of ast.names) {
            results[collection] = await run(collection, ast.children[collection], ast.query[collection]);
        }
        return results;
    }
    else {
        return await run(ast.name, ast.children, options?.query || ast.query);
    }
    async function run(collection, children, query) {
        // Retrieve the database columns to select in the current AST
        const { fieldNodes, primaryKeyField, nestedCollectionNodes } = await parseCurrentLevel(schema, collection, children, query);
        // The actual knex query builder instance. This is a promise that resolves with the raw items from the db
        const dbQuery = await getDBQuery(schema, knex, collection, fieldNodes, query);
        const rawItems = await dbQuery;
        if (!rawItems)
            return null;
        // Run the items through the special transforms
        const payloadService = new payload_1.PayloadService(collection, { knex, schema });
        let items = await payloadService.processValues('read', rawItems);
        if (!items || (Array.isArray(items) && items.length === 0))
            return items;
        // Apply the `_in` filters to the nested collection batches
        const nestedNodes = applyParentFilters(schema, nestedCollectionNodes, items);
        for (const nestedNode of nestedNodes) {
            let nestedItems = [];
            if (nestedNode.type === 'o2m') {
                let hasMore = true;
                let batchCount = 0;
                while (hasMore) {
                    const node = (0, lodash_1.merge)({}, nestedNode, {
                        query: {
                            limit: env_1.default['RELATIONAL_BATCH_SIZE'],
                            offset: batchCount * env_1.default['RELATIONAL_BATCH_SIZE'],
                            page: null,
                        },
                    });
                    nestedItems = (await runAST(node, schema, { knex, nested: true }));
                    if (nestedItems) {
                        items = mergeWithParentItems(schema, nestedItems, items, nestedNode);
                    }
                    if (!nestedItems || nestedItems.length < env_1.default['RELATIONAL_BATCH_SIZE']) {
                        hasMore = false;
                    }
                    batchCount++;
                }
            }
            else {
                const node = (0, lodash_1.merge)({}, nestedNode, {
                    query: { limit: -1 },
                });
                nestedItems = (await runAST(node, schema, { knex, nested: true }));
                if (nestedItems) {
                    // Merge all fetched nested records with the parent items
                    items = mergeWithParentItems(schema, nestedItems, items, nestedNode);
                }
            }
        }
        // During the fetching of data, we have to inject a couple of required fields for the child nesting
        // to work (primary / foreign keys) even if they're not explicitly requested. After all fetching
        // and nesting is done, we parse through the output structure, and filter out all non-requested
        // fields
        if (options?.nested !== true && options?.stripNonRequested !== false) {
            items = removeTemporaryFields(schema, items, originalAST, primaryKeyField);
        }
        return items;
    }
}
exports.default = runAST;
async function parseCurrentLevel(schema, collection, children, query) {
    const primaryKeyField = schema.collections[collection].primary;
    const columnsInCollection = Object.keys(schema.collections[collection].fields);
    const columnsToSelectInternal = [];
    const nestedCollectionNodes = [];
    for (const child of children) {
        if (child.type === 'field' || child.type === 'functionField') {
            const fieldName = (0, strip_function_1.stripFunction)(child.name);
            if (columnsInCollection.includes(fieldName)) {
                columnsToSelectInternal.push(child.fieldKey);
            }
            continue;
        }
        if (!child.relation)
            continue;
        if (child.type === 'm2o') {
            columnsToSelectInternal.push(child.relation.field);
        }
        if (child.type === 'a2o') {
            columnsToSelectInternal.push(child.relation.field);
            columnsToSelectInternal.push(child.relation.meta.one_collection_field);
        }
        nestedCollectionNodes.push(child);
    }
    const isAggregate = (query.group || (query.aggregate && Object.keys(query.aggregate).length > 0)) ?? false;
    /** Always fetch primary key in case there's a nested relation that needs it. Aggregate payloads
     * can't have nested relational fields
     */
    if (isAggregate === false && columnsToSelectInternal.includes(primaryKeyField) === false) {
        columnsToSelectInternal.push(primaryKeyField);
    }
    /** Make sure select list has unique values */
    const columnsToSelect = [...new Set(columnsToSelectInternal)];
    const fieldNodes = columnsToSelect.map((column) => children.find((childNode) => (childNode.type === 'field' || childNode.type === 'functionField') && childNode.fieldKey === column) ?? {
        type: 'field',
        name: column,
        fieldKey: column,
    });
    return { fieldNodes, nestedCollectionNodes, primaryKeyField };
}
function getColumnPreprocessor(knex, schema, table) {
    const helpers = (0, helpers_1.getHelpers)(knex);
    return function (fieldNode) {
        let alias = undefined;
        if (fieldNode.name !== fieldNode.fieldKey) {
            alias = fieldNode.fieldKey;
        }
        let field;
        if (fieldNode.type === 'field' || fieldNode.type === 'functionField') {
            field = schema.collections[table].fields[(0, strip_function_1.stripFunction)(fieldNode.name)];
        }
        else {
            field = schema.collections[fieldNode.relation.collection].fields[fieldNode.relation.field];
        }
        if (field?.type?.startsWith('geometry')) {
            return helpers.st.asText(table, field.field);
        }
        if (fieldNode.type === 'functionField') {
            return (0, get_column_1.getColumn)(knex, table, fieldNode.name, alias, schema, { query: fieldNode.query });
        }
        return (0, get_column_1.getColumn)(knex, table, fieldNode.name, alias, schema);
    };
}
async function getDBQuery(schema, knex, table, fieldNodes, query) {
    const preProcess = getColumnPreprocessor(knex, schema, table);
    const queryCopy = (0, lodash_1.clone)(query);
    const helpers = (0, helpers_1.getHelpers)(knex);
    queryCopy.limit = typeof queryCopy.limit === 'number' ? queryCopy.limit : 100;
    // Queries with aggregates and groupBy will not have duplicate result
    if (queryCopy.aggregate || queryCopy.group) {
        const flatQuery = knex.select(fieldNodes.map(preProcess)).from(table);
        return await (0, apply_query_1.default)(knex, table, flatQuery, queryCopy, schema).query;
    }
    const primaryKey = schema.collections[table].primary;
    const aliasMap = Object.create(null);
    let dbQuery = knex.from(table);
    let sortRecords;
    const innerQuerySortRecords = [];
    let hasMultiRelationalSort;
    if (queryCopy.sort) {
        const sortResult = (0, apply_query_1.applySort)(knex, schema, dbQuery, queryCopy.sort, table, aliasMap, true);
        if (sortResult) {
            sortRecords = sortResult.sortRecords;
            hasMultiRelationalSort = sortResult.hasMultiRelationalSort;
        }
    }
    const { hasMultiRelationalFilter } = (0, apply_query_1.default)(knex, table, dbQuery, queryCopy, schema, {
        aliasMap,
        isInnerQuery: true,
        hasMultiRelationalSort,
    });
    const needsInnerQuery = hasMultiRelationalSort || hasMultiRelationalFilter;
    if (needsInnerQuery) {
        dbQuery.select(`${table}.${primaryKey}`).distinct();
    }
    else {
        dbQuery.select(fieldNodes.map(preProcess));
    }
    if (sortRecords) {
        // Clears the order if any, eg: from MSSQL offset
        dbQuery.clear('order');
        if (needsInnerQuery) {
            let orderByString = '';
            const orderByFields = [];
            sortRecords.map((sortRecord) => {
                if (orderByString.length !== 0) {
                    orderByString += ', ';
                }
                const sortAlias = `sort_${(0, apply_query_1.generateAlias)()}`;
                if (sortRecord.column.includes('.')) {
                    const [alias, field] = sortRecord.column.split('.');
                    const originalCollectionName = (0, get_collection_from_alias_1.getCollectionFromAlias)(alias, aliasMap);
                    dbQuery.select((0, get_column_1.getColumn)(knex, alias, field, sortAlias, schema, { originalCollectionName }));
                    orderByString += `?? ${sortRecord.order}`;
                    orderByFields.push((0, get_column_1.getColumn)(knex, alias, field, false, schema, { originalCollectionName }));
                }
                else {
                    dbQuery.select((0, get_column_1.getColumn)(knex, table, sortRecord.column, sortAlias, schema));
                    orderByString += `?? ${sortRecord.order}`;
                    orderByFields.push((0, get_column_1.getColumn)(knex, table, sortRecord.column, false, schema));
                }
                innerQuerySortRecords.push({ alias: sortAlias, order: sortRecord.order });
            });
            dbQuery.orderByRaw(orderByString, orderByFields);
            if (hasMultiRelationalSort) {
                dbQuery = helpers.schema.applyMultiRelationalSort(knex, dbQuery, table, primaryKey, orderByString, orderByFields);
            }
        }
        else {
            sortRecords.map((sortRecord) => {
                if (sortRecord.column.includes('.')) {
                    const [alias, field] = sortRecord.column.split('.');
                    sortRecord.column = (0, get_column_1.getColumn)(knex, alias, field, false, schema, {
                        originalCollectionName: (0, get_collection_from_alias_1.getCollectionFromAlias)(alias, aliasMap),
                    });
                }
                else {
                    sortRecord.column = (0, get_column_1.getColumn)(knex, table, sortRecord.column, false, schema);
                }
            });
            dbQuery.orderBy(sortRecords);
        }
    }
    if (!needsInnerQuery)
        return dbQuery;
    const wrapperQuery = knex
        .select(fieldNodes.map(preProcess))
        .from(table)
        .innerJoin(knex.raw('??', dbQuery.as('inner')), `${table}.${primaryKey}`, `inner.${primaryKey}`);
    if (sortRecords && needsInnerQuery) {
        innerQuerySortRecords.map((innerQuerySortRecord) => {
            wrapperQuery.orderBy(`inner.${innerQuerySortRecord.alias}`, innerQuerySortRecord.order);
        });
        if (hasMultiRelationalSort) {
            wrapperQuery.where('inner.directus_row_number', '=', 1);
            (0, apply_query_1.applyLimit)(knex, wrapperQuery, queryCopy.limit);
        }
    }
    return wrapperQuery;
}
function applyParentFilters(schema, nestedCollectionNodes, parentItem) {
    const parentItems = (0, utils_1.toArray)(parentItem);
    for (const nestedNode of nestedCollectionNodes) {
        if (!nestedNode.relation)
            continue;
        if (nestedNode.type === 'm2o') {
            const foreignField = schema.collections[nestedNode.relation.related_collection].primary;
            const foreignIds = (0, lodash_1.uniq)(parentItems.map((res) => res[nestedNode.relation.field])).filter((id) => !(0, lodash_1.isNil)(id));
            (0, lodash_1.merge)(nestedNode, { query: { filter: { [foreignField]: { _in: foreignIds } } } });
        }
        else if (nestedNode.type === 'o2m') {
            const relatedM2OisFetched = !!nestedNode.children.find((child) => {
                return child.type === 'field' && child.name === nestedNode.relation.field;
            });
            if (relatedM2OisFetched === false) {
                nestedNode.children.push({
                    type: 'field',
                    name: nestedNode.relation.field,
                    fieldKey: nestedNode.relation.field,
                });
            }
            if (nestedNode.relation.meta?.sort_field) {
                nestedNode.children.push({
                    type: 'field',
                    name: nestedNode.relation.meta.sort_field,
                    fieldKey: nestedNode.relation.meta.sort_field,
                });
            }
            const foreignField = nestedNode.relation.field;
            const foreignIds = (0, lodash_1.uniq)(parentItems.map((res) => res[nestedNode.parentKey])).filter((id) => !(0, lodash_1.isNil)(id));
            (0, lodash_1.merge)(nestedNode, { query: { filter: { [foreignField]: { _in: foreignIds } } } });
        }
        else if (nestedNode.type === 'a2o') {
            const keysPerCollection = {};
            for (const parentItem of parentItems) {
                const collection = parentItem[nestedNode.relation.meta.one_collection_field];
                if (!keysPerCollection[collection])
                    keysPerCollection[collection] = [];
                keysPerCollection[collection].push(parentItem[nestedNode.relation.field]);
            }
            for (const relatedCollection of nestedNode.names) {
                const foreignField = nestedNode.relatedKey[relatedCollection];
                const foreignIds = (0, lodash_1.uniq)(keysPerCollection[relatedCollection]);
                (0, lodash_1.merge)(nestedNode, {
                    query: { [relatedCollection]: { filter: { [foreignField]: { _in: foreignIds } }, limit: foreignIds.length } },
                });
            }
        }
    }
    return nestedCollectionNodes;
}
function mergeWithParentItems(schema, nestedItem, parentItem, nestedNode) {
    const nestedItems = (0, utils_1.toArray)(nestedItem);
    const parentItems = (0, lodash_1.clone)((0, utils_1.toArray)(parentItem));
    if (nestedNode.type === 'm2o') {
        for (const parentItem of parentItems) {
            const itemChild = nestedItems.find((nestedItem) => {
                return (nestedItem[schema.collections[nestedNode.relation.related_collection].primary] ==
                    parentItem[nestedNode.relation.field]);
            });
            parentItem[nestedNode.fieldKey] = itemChild || null;
        }
    }
    else if (nestedNode.type === 'o2m') {
        for (const parentItem of parentItems) {
            if (!parentItem[nestedNode.fieldKey])
                parentItem[nestedNode.fieldKey] = [];
            const itemChildren = nestedItems.filter((nestedItem) => {
                if (nestedItem === null)
                    return false;
                if (Array.isArray(nestedItem[nestedNode.relation.field]))
                    return true;
                return (nestedItem[nestedNode.relation.field] ==
                    parentItem[schema.collections[nestedNode.relation.related_collection].primary] ||
                    nestedItem[nestedNode.relation.field]?.[schema.collections[nestedNode.relation.related_collection].primary] == parentItem[schema.collections[nestedNode.relation.related_collection].primary]);
            });
            parentItem[nestedNode.fieldKey].push(...itemChildren);
            if (nestedNode.query.page && nestedNode.query.page > 1) {
                parentItem[nestedNode.fieldKey] = parentItem[nestedNode.fieldKey].slice((nestedNode.query.limit ?? 100) * (nestedNode.query.page - 1));
            }
            if (nestedNode.query.offset && nestedNode.query.offset >= 0) {
                parentItem[nestedNode.fieldKey] = parentItem[nestedNode.fieldKey].slice(nestedNode.query.offset);
            }
            if (nestedNode.query.limit !== -1) {
                parentItem[nestedNode.fieldKey] = parentItem[nestedNode.fieldKey].slice(0, nestedNode.query.limit ?? 100);
            }
            parentItem[nestedNode.fieldKey] = parentItem[nestedNode.fieldKey].sort((a, b) => {
                // This is pre-filled in get-ast-from-query
                const sortField = nestedNode.query.sort[0];
                let column = sortField;
                let order = 'asc';
                if (sortField.startsWith('-')) {
                    column = sortField.substring(1);
                    order = 'desc';
                }
                if (a[column] === b[column])
                    return 0;
                if (a[column] === null)
                    return 1;
                if (b[column] === null)
                    return -1;
                if (order === 'asc') {
                    return a[column] < b[column] ? -1 : 1;
                }
                else {
                    return a[column] < b[column] ? 1 : -1;
                }
            });
        }
    }
    else if (nestedNode.type === 'a2o') {
        for (const parentItem of parentItems) {
            if (!nestedNode.relation.meta?.one_collection_field) {
                parentItem[nestedNode.fieldKey] = null;
                continue;
            }
            const relatedCollection = parentItem[nestedNode.relation.meta.one_collection_field];
            if (!nestedItem[relatedCollection]) {
                parentItem[nestedNode.fieldKey] = null;
                continue;
            }
            const itemChild = nestedItem[relatedCollection].find((nestedItem) => {
                return nestedItem[nestedNode.relatedKey[relatedCollection]] == parentItem[nestedNode.fieldKey];
            });
            parentItem[nestedNode.fieldKey] = itemChild || null;
        }
    }
    return Array.isArray(parentItem) ? parentItems : parentItems[0];
}
function removeTemporaryFields(schema, rawItem, ast, primaryKeyField, parentItem) {
    const rawItems = (0, lodash_1.cloneDeep)((0, utils_1.toArray)(rawItem));
    const items = [];
    if (ast.type === 'a2o') {
        const fields = {};
        const nestedCollectionNodes = {};
        for (const relatedCollection of ast.names) {
            if (!fields[relatedCollection])
                fields[relatedCollection] = [];
            if (!nestedCollectionNodes[relatedCollection])
                nestedCollectionNodes[relatedCollection] = [];
            for (const child of ast.children[relatedCollection]) {
                if (child.type === 'field' || child.type === 'functionField') {
                    fields[relatedCollection].push(child.name);
                }
                else {
                    fields[relatedCollection].push(child.fieldKey);
                    nestedCollectionNodes[relatedCollection].push(child);
                }
            }
        }
        for (const rawItem of rawItems) {
            const relatedCollection = parentItem?.[ast.relation.meta.one_collection_field];
            if (rawItem === null || rawItem === undefined)
                return rawItem;
            let item = rawItem;
            for (const nestedNode of nestedCollectionNodes[relatedCollection]) {
                item[nestedNode.fieldKey] = removeTemporaryFields(schema, item[nestedNode.fieldKey], nestedNode, schema.collections[nestedNode.relation.collection].primary, item);
            }
            const fieldsWithFunctionsApplied = fields[relatedCollection].map((field) => (0, apply_function_to_column_name_1.applyFunctionToColumnName)(field));
            item =
                fields[relatedCollection].length > 0 ? (0, lodash_1.pick)(rawItem, fieldsWithFunctionsApplied) : rawItem[primaryKeyField];
            items.push(item);
        }
    }
    else {
        const fields = [];
        const nestedCollectionNodes = [];
        for (const child of ast.children) {
            fields.push(child.fieldKey);
            if (child.type !== 'field' && child.type !== 'functionField') {
                nestedCollectionNodes.push(child);
            }
        }
        // Make sure any requested aggregate fields are included
        if (ast.query?.aggregate) {
            for (const [operation, aggregateFields] of Object.entries(ast.query.aggregate)) {
                if (!fields)
                    continue;
                if (operation === 'count' && aggregateFields.includes('*'))
                    fields.push('count');
                fields.push(...aggregateFields.map((field) => `${operation}.${field}`));
            }
        }
        for (const rawItem of rawItems) {
            if (rawItem === null || rawItem === undefined)
                return rawItem;
            let item = rawItem;
            for (const nestedNode of nestedCollectionNodes) {
                item[nestedNode.fieldKey] = removeTemporaryFields(schema, item[nestedNode.fieldKey], nestedNode, nestedNode.type === 'm2o'
                    ? schema.collections[nestedNode.relation.related_collection].primary
                    : schema.collections[nestedNode.relation.collection].primary, item);
            }
            const fieldsWithFunctionsApplied = fields.map((field) => (0, apply_function_to_column_name_1.applyFunctionToColumnName)(field));
            item = fields.length > 0 ? (0, lodash_1.pick)(rawItem, fieldsWithFunctionsApplied) : rawItem[primaryKeyField];
            items.push(item);
        }
    }
    return Array.isArray(rawItem) ? items : items[0];
}
