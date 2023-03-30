import type { BaseException } from '@directus/shared/exceptions';
import { Accountability, Filter, Query, SchemaOverview } from '@directus/shared/types';
import { ArgumentNode, FormattedExecutionResult, FragmentDefinitionNode, GraphQLError, GraphQLResolveInfo, GraphQLSchema, SelectionNode } from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import type { Knex } from 'knex';
import type { AbstractServiceOptions, GraphQLParams, Item } from '../../types';
import { ItemsService } from '../items';
export declare class GraphQLService {
    accountability: Accountability | null;
    knex: Knex;
    schema: SchemaOverview;
    scope: 'items' | 'system';
    constructor(options: AbstractServiceOptions & {
        scope: 'items' | 'system';
    });
    /**
     * Execute a GraphQL structure
     */
    execute({ document, variables, operationName, contextValue, }: GraphQLParams): Promise<FormattedExecutionResult>;
    /**
     * Generate the GraphQL schema. Pulls from the schema information generated by the get-schema util.
     */
    getSchema(): GraphQLSchema;
    getSchema(type: 'schema'): GraphQLSchema;
    getSchema(type: 'sdl'): GraphQLSchema | string;
    /**
     * Generic resolver that's used for every "regular" items/system query. Converts the incoming GraphQL AST / fragments into
     * Directus' query structure which is then executed by the services.
     */
    resolveQuery(info: GraphQLResolveInfo): Promise<Partial<Item> | null>;
    resolveMutation(args: Record<string, any>, info: GraphQLResolveInfo): Promise<Partial<Item> | boolean | undefined>;
    /**
     * Execute the read action on the correct service. Checks for singleton as well.
     */
    read(collection: string, query: Query): Promise<Partial<Item>>;
    /**
     * Upsert and read singleton item
     */
    upsertSingleton(collection: string, body: Record<string, any> | Record<string, any>[], query: Query): Promise<Partial<Item> | boolean>;
    /**
     * GraphQL's regular resolver `args` variable only contains the "top-level" arguments. Seeing that we convert the
     * whole nested tree into one big query using Directus' own query resolver, we want to have a nested structure of
     * arguments for the whole resolving tree, which can later be transformed into Directus' AST using `deep`.
     * In order to do that, we'll parse over all ArgumentNodes and ObjectFieldNodes to manually recreate an object structure
     * of arguments
     */
    parseArgs(args: readonly ArgumentNode[], variableValues: GraphQLResolveInfo['variableValues']): Record<string, any>;
    /**
     * Get a Directus Query object from the parsed arguments (rawQuery) and GraphQL AST selectionSet. Converts SelectionSet into
     * Directus' `fields` query for use in the resolver. Also applies variables where appropriate.
     */
    getQuery(rawQuery: Query, selections: readonly SelectionNode[], variableValues: GraphQLResolveInfo['variableValues']): Query;
    /**
     * Resolve the aggregation query based on the requested aggregated fields
     */
    getAggregateQuery(rawQuery: Query, selections: readonly SelectionNode[]): Query;
    /**
     * Replace functions from GraphQL format to Directus-Filter format
     */
    replaceFuncs(filter: Filter): Filter;
    /**
     * Convert Directus-Exception into a GraphQL format, so it can be returned by GraphQL properly.
     */
    formatError(error: BaseException | BaseException[]): GraphQLError;
    /**
     * Select the correct service for the given collection. This allows the individual services to run
     * their custom checks (f.e. it allows UsersService to prevent updating TFA secret from outside)
     */
    getService(collection: string): ItemsService;
    /**
     * Replace all fragments in a selectionset for the actual selection set as defined in the fragment
     * Effectively merges the selections with the fragments used in those selections
     */
    replaceFragmentsInSelections(selections: readonly SelectionNode[] | undefined, fragments: Record<string, FragmentDefinitionNode>): readonly SelectionNode[] | null;
    injectSystemResolvers(schemaComposer: SchemaComposer<GraphQLParams['contextValue']>, { CreateCollectionTypes, ReadCollectionTypes, UpdateCollectionTypes, DeleteCollectionTypes, }: {
        CreateCollectionTypes: Record<string, ObjectTypeComposer<any, any>>;
        ReadCollectionTypes: Record<string, ObjectTypeComposer<any, any>>;
        UpdateCollectionTypes: Record<string, ObjectTypeComposer<any, any>>;
        DeleteCollectionTypes: Record<string, ObjectTypeComposer<any, any>>;
    }, schema: {
        create: SchemaOverview;
        read: SchemaOverview;
        update: SchemaOverview;
        delete: SchemaOverview;
    }): SchemaComposer<any>;
}
