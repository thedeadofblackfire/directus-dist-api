"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const validate_diff_1 = require("./validate-diff");
(0, vitest_1.test)('should fail on invalid diff schema', () => {
    const diff = {};
    const snapshot = {};
    (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toThrowError('"hash" is required');
});
(0, vitest_1.test)('should fail on invalid hash', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [{ collection: 'test', diff: [] }], fields: [], relations: [] },
    };
    const snapshot = { hash: 'xyz' };
    (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toThrowError("Provided hash does not match the current instance's schema hash");
});
(0, vitest_1.describe)('should throw accurate error', () => {
    const baseDiff = (partialDiff) => {
        return {
            hash: 'abc',
            diff: {
                fields: [],
                collections: [],
                relations: [],
                ...partialDiff,
            },
        };
    };
    const baseSnapshot = (partialSnapshot) => {
        return {
            hash: 'xyz',
            collections: [],
            fields: [],
            relations: [],
            ...partialSnapshot,
        };
    };
    (0, vitest_1.test)('creating collection which already exists', () => {
        const diff = baseDiff({
            collections: [{ collection: 'test', diff: [{ kind: 'N', rhs: {} }] }],
        });
        const snapshot = baseSnapshot({ collections: [{ collection: 'test' }] });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toThrowError('Provided diff is trying to create collection "test" but it already exists');
    });
    (0, vitest_1.test)('deleting collection which does not exist', () => {
        const diff = baseDiff({
            collections: [{ collection: 'test', diff: [{ kind: 'D', lhs: {} }] }],
        });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete collection "test" but it does not exist');
    });
    (0, vitest_1.test)('creating field which already exists', () => {
        const diff = baseDiff({
            fields: [{ collection: 'test', field: 'test', diff: [{ kind: 'N', rhs: {} }] }],
        });
        const snapshot = baseSnapshot({ fields: [{ collection: 'test', field: 'test' }] });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toThrowError('Provided diff is trying to create field "test.test" but it already exists');
    });
    (0, vitest_1.test)('deleting field which does not exist', () => {
        const diff = baseDiff({
            fields: [{ collection: 'test', field: 'test', diff: [{ kind: 'D', lhs: {} }] }],
        });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete field "test.test" but it does not exist');
    });
    (0, vitest_1.test)('creating relation which already exists', () => {
        const diff = baseDiff({
            relations: [
                {
                    collection: 'test',
                    field: 'test',
                    related_collection: 'relation',
                    diff: [{ kind: 'N', rhs: {} }],
                },
            ],
        });
        const snapshot = baseSnapshot({
            relations: [{ collection: 'test', field: 'test', related_collection: 'relation' }],
        });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toThrowError('Provided diff is trying to create relation "test.test-> relation" but it already exists');
    });
    (0, vitest_1.test)('deleting relation which does not exist', () => {
        const diff = baseDiff({
            relations: [
                {
                    collection: 'test',
                    field: 'test',
                    related_collection: 'relation',
                    diff: [{ kind: 'D', lhs: {} }],
                },
            ],
        });
        (0, vitest_1.expect)(() => (0, validate_diff_1.validateApplyDiff)(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete relation "test.test-> relation" but it does not exist');
    });
});
(0, vitest_1.test)('should detect empty diff', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [], fields: [], relations: [] },
    };
    const snapshot = {};
    (0, vitest_1.expect)((0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toBe(false);
});
(0, vitest_1.test)('should pass on valid diff', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [{ collection: 'test', diff: [] }], fields: [], relations: [] },
    };
    const snapshot = { hash: 'abc' };
    (0, vitest_1.expect)((0, validate_diff_1.validateApplyDiff)(diff, snapshot)).toBe(true);
});
