"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructFlowTree = void 0;
const lodash_1 = require("lodash");
function constructFlowTree(flow) {
    const rootOperation = flow.operations.find((operation) => operation.id === flow.operation) ?? null;
    const operationTree = constructOperationTree(rootOperation, flow.operations);
    const flowTree = {
        ...(0, lodash_1.omit)(flow, 'operations'),
        operation: operationTree,
        options: flow.options ?? {},
    };
    return flowTree;
}
exports.constructFlowTree = constructFlowTree;
function constructOperationTree(root, operations) {
    if (root === null) {
        return null;
    }
    const resolveOperation = root.resolve !== null ? operations.find((operation) => operation.id === root.resolve) : null;
    const rejectOperation = root.reject !== null ? operations.find((operation) => operation.id === root.reject) : null;
    if (resolveOperation === undefined || rejectOperation === undefined) {
        throw new Error('Undefined reference in operations');
    }
    const operationTree = {
        ...(0, lodash_1.omit)(root, 'flow'),
        resolve: constructOperationTree(resolveOperation, operations),
        reject: constructOperationTree(rejectOperation, operations),
    };
    return operationTree;
}
