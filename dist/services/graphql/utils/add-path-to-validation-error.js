"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPathToValidationError = void 0;
const graphql_1 = require("graphql");
function addPathToValidationError(validationError) {
    const token = validationError.nodes?.[0]?.loc?.startToken;
    if (!token)
        return validationError;
    let prev = token;
    const queryRegex = /query_[A-Za-z0-9]{8}/;
    while (prev) {
        if (prev.kind === 'Name' && prev.value && queryRegex.test(prev.value)) {
            return (0, graphql_1.locatedError)(validationError, validationError.nodes, [prev.value]);
        }
        prev = prev.prev;
    }
    return (0, graphql_1.locatedError)(validationError, validationError.nodes);
}
exports.addPathToValidationError = addPathToValidationError;
