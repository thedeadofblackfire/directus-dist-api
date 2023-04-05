import type { Type } from '@directus/types';
import { GraphQLList, GraphQLScalarType, GraphQLType } from 'graphql';
export declare function getGraphQLType(localType: Type | 'alias' | 'unknown', special: string[]): GraphQLScalarType | GraphQLList<GraphQLType>;
