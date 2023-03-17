"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex_mock_client_1 = require("knex-mock-client");
const vitest_1 = require("vitest");
const services_1 = require("../../src/services");
class Client_PG extends knex_mock_client_1.MockClient {
}
(0, vitest_1.describe)('Integration Tests', () => {
    let db;
    let tracker;
    (0, vitest_1.beforeAll)(async () => {
        db = vitest_1.vi.mocked((0, knex_1.default)({ client: Client_PG }));
        tracker = (0, knex_mock_client_1.createTracker)(db);
    });
    (0, vitest_1.afterEach)(() => {
        tracker.reset();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('Services / Specifications', () => {
        (0, vitest_1.describe)('oas', () => {
            (0, vitest_1.describe)('generate', () => {
                let service;
                (0, vitest_1.beforeEach)(() => {
                    service = new services_1.SpecificationService({
                        knex: db,
                        schema: { collections: {}, relations: [] },
                        accountability: { role: 'admin', admin: true },
                    });
                });
                (0, vitest_1.describe)('schema', () => {
                    (0, vitest_1.it)('returns untyped schema for json fields', async () => {
                        var _a;
                        vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'readByQuery').mockResolvedValue([
                            {
                                collection: 'test_table',
                                meta: {
                                    accountability: 'all',
                                    collection: 'test_table',
                                    group: null,
                                    hidden: false,
                                    icon: null,
                                    item_duplication_fields: null,
                                    note: null,
                                    singleton: false,
                                    translations: null,
                                },
                                schema: {
                                    name: 'test_table',
                                },
                            },
                        ]);
                        vitest_1.vi.spyOn(services_1.FieldsService.prototype, 'readAll').mockResolvedValue([
                            {
                                collection: 'test_table',
                                field: 'id',
                                name: 'id',
                                type: 'integer',
                                meta: {
                                    id: 1,
                                    collection: 'test_table',
                                    conditions: null,
                                    display: null,
                                    display_options: null,
                                    field: 'id',
                                    group: null,
                                    hidden: true,
                                    interface: null,
                                    note: null,
                                    options: null,
                                    readonly: false,
                                    required: false,
                                    sort: null,
                                    special: null,
                                    translations: null,
                                    validation: null,
                                    validation_message: null,
                                    width: 'full',
                                },
                                schema: {
                                    comment: null,
                                    data_type: 'integer',
                                    default_value: null,
                                    foreign_key_column: null,
                                    foreign_key_schema: null,
                                    foreign_key_table: null,
                                    generation_expression: null,
                                    has_auto_increment: false,
                                    is_generated: false,
                                    is_nullable: false,
                                    is_primary_key: true,
                                    is_unique: true,
                                    max_length: null,
                                    name: 'id',
                                    numeric_precision: null,
                                    numeric_scale: null,
                                    table: 'test_table',
                                },
                            },
                            {
                                collection: 'test_table',
                                field: 'blob',
                                name: 'blob',
                                type: 'json',
                                meta: {
                                    id: 2,
                                    collection: 'test_table',
                                    conditions: null,
                                    display: null,
                                    display_options: null,
                                    field: 'blob',
                                    group: null,
                                    hidden: true,
                                    interface: null,
                                    note: null,
                                    options: null,
                                    readonly: false,
                                    required: false,
                                    sort: null,
                                    special: null,
                                    translations: null,
                                    validation: null,
                                    validation_message: null,
                                    width: 'full',
                                },
                                schema: {
                                    comment: null,
                                    data_type: 'json',
                                    default_value: null,
                                    foreign_key_column: null,
                                    foreign_key_schema: null,
                                    foreign_key_table: null,
                                    generation_expression: null,
                                    has_auto_increment: false,
                                    is_generated: false,
                                    is_nullable: true,
                                    is_primary_key: false,
                                    is_unique: false,
                                    max_length: null,
                                    name: 'blob',
                                    numeric_precision: null,
                                    numeric_scale: null,
                                    table: 'test_table',
                                },
                            },
                        ]);
                        vitest_1.vi.spyOn(services_1.RelationsService.prototype, 'readAll').mockResolvedValue([]);
                        const spec = await service.oas.generate();
                        (0, vitest_1.expect)((_a = spec.components) === null || _a === void 0 ? void 0 : _a.schemas).toMatchInlineSnapshot(`
							{
							  "Diff": {
							    "properties": {
							      "diff": {
							        "properties": {
							          "collections": {
							            "items": {
							              "properties": {
							                "collection": {
							                  "type": "string",
							                },
							                "diff": {
							                  "items": {
							                    "type": "object",
							                  },
							                  "type": "array",
							                },
							              },
							              "type": "object",
							            },
							            "type": "array",
							          },
							          "fields": {
							            "items": {
							              "properties": {
							                "collection": {
							                  "type": "string",
							                },
							                "diff": {
							                  "items": {
							                    "type": "object",
							                  },
							                  "type": "array",
							                },
							                "field": {
							                  "type": "string",
							                },
							              },
							              "type": "object",
							            },
							            "type": "array",
							          },
							          "relations": {
							            "items": {
							              "properties": {
							                "collection": {
							                  "type": "string",
							                },
							                "diff": {
							                  "items": {
							                    "type": "object",
							                  },
							                  "type": "array",
							                },
							                "field": {
							                  "type": "string",
							                },
							                "related_collection": {
							                  "type": "string",
							                },
							              },
							              "type": "object",
							            },
							            "type": "array",
							          },
							        },
							        "type": "object",
							      },
							      "hash": {
							        "type": "string",
							      },
							    },
							    "type": "object",
							  },
							  "ItemsTestTable": {
							    "properties": {
							      "blob": {
							        "description": undefined,
							        "nullable": true,
							      },
							      "id": {
							        "description": undefined,
							        "nullable": false,
							        "type": "integer",
							      },
							    },
							    "type": "object",
							    "x-collection": "test_table",
							  },
							  "Query": {
							    "properties": {
							      "deep": {
							        "description": "Deep allows you to set any of the other query parameters on a nested relational dataset.",
							        "example": {
							          "related_articles": {
							            "_limit": 3,
							          },
							        },
							        "type": "object",
							      },
							      "fields": {
							        "description": "Control what fields are being returned in the object.",
							        "example": [
							          "*",
							          "*.*",
							        ],
							        "items": {
							          "type": "string",
							        },
							        "type": "array",
							      },
							      "filter": {
							        "example": {
							          "<field>": {
							            "<operator>": "<value>",
							          },
							        },
							        "type": "object",
							      },
							      "limit": {
							        "description": "Set the maximum number of items that will be returned",
							        "type": "number",
							      },
							      "offset": {
							        "description": "How many items to skip when fetching data.",
							        "type": "number",
							      },
							      "page": {
							        "description": "Cursor for use in pagination. Often used in combination with limit.",
							        "type": "number",
							      },
							      "search": {
							        "description": "Filter by items that contain the given search query in one of their fields.",
							        "type": "string",
							      },
							      "sort": {
							        "description": "How to sort the returned items.",
							        "example": [
							          "-date_created",
							        ],
							        "items": {
							          "type": "string",
							        },
							        "type": "array",
							      },
							    },
							    "type": "object",
							  },
							  "Schema": {
							    "properties": {
							      "collections": {
							        "items": {
							          "$ref": "#/components/schemas/Collections",
							        },
							        "type": "array",
							      },
							      "directus": {
							        "type": "string",
							      },
							      "fields": {
							        "items": {
							          "$ref": "#/components/schemas/Fields",
							        },
							        "type": "array",
							      },
							      "relations": {
							        "items": {
							          "$ref": "#/components/schemas/Relations",
							        },
							        "type": "array",
							      },
							      "vendor": {
							        "type": "string",
							      },
							      "version": {
							        "example": 1,
							        "type": "integer",
							      },
							    },
							    "type": "object",
							  },
							  "x-metadata": {
							    "properties": {
							      "filter_count": {
							        "description": "Returns the item count of the collection you're querying, taking the current filter/search parameters into account.",
							        "type": "integer",
							      },
							      "total_count": {
							        "description": "Returns the total item count of the collection you're querying.",
							        "type": "integer",
							      },
							    },
							    "type": "object",
							  },
							}
						`);
                    });
                });
                (0, vitest_1.describe)('path', () => {
                    (0, vitest_1.it)('requestBody for CreateItems POST path should not have type in schema', async () => {
                        const collection = {
                            collection: 'test_table',
                            meta: {
                                accountability: 'all',
                                collection: 'test_table',
                                group: null,
                                hidden: false,
                                icon: null,
                                item_duplication_fields: null,
                                note: null,
                                singleton: false,
                                translations: {},
                            },
                            schema: {
                                name: 'test_table',
                            },
                        };
                        vitest_1.vi.spyOn(services_1.CollectionsService.prototype, 'readByQuery').mockResolvedValue([collection]);
                        vitest_1.vi.spyOn(services_1.FieldsService.prototype, 'readAll').mockResolvedValue([
                            {
                                collection: collection.collection,
                                field: 'id',
                                name: 'id',
                                type: 'integer',
                                meta: {
                                    id: 1,
                                    collection: 'test_table',
                                    conditions: null,
                                    display: null,
                                    display_options: null,
                                    field: 'id',
                                    group: null,
                                    hidden: true,
                                    interface: null,
                                    note: null,
                                    options: null,
                                    readonly: false,
                                    required: false,
                                    sort: null,
                                    special: null,
                                    translations: null,
                                    validation: null,
                                    validation_message: null,
                                    width: 'full',
                                },
                                schema: {
                                    comment: null,
                                    data_type: 'integer',
                                    default_value: null,
                                    foreign_key_column: null,
                                    foreign_key_schema: null,
                                    foreign_key_table: null,
                                    generation_expression: null,
                                    has_auto_increment: false,
                                    is_generated: false,
                                    is_nullable: false,
                                    is_primary_key: true,
                                    is_unique: true,
                                    max_length: null,
                                    name: 'id',
                                    numeric_precision: null,
                                    numeric_scale: null,
                                    table: 'test_table',
                                },
                            },
                        ]);
                        vitest_1.vi.spyOn(services_1.RelationsService.prototype, 'readAll').mockResolvedValue([]);
                        const spec = await service.oas.generate();
                        const targetSchema = spec.paths[`/items/${collection.collection}`].post.requestBody.content['application/json'].schema;
                        (0, vitest_1.expect)(targetSchema).toHaveProperty('oneOf');
                        (0, vitest_1.expect)(targetSchema).not.toHaveProperty('type');
                    });
                });
            });
        });
    });
});
