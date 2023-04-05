import { describe, expect, test } from 'vitest';
import { validateApplyDiff } from './validate-diff.js';
test('should fail on invalid diff schema', () => {
    const diff = {};
    const snapshot = {};
    expect(() => validateApplyDiff(diff, snapshot)).toThrowError('"hash" is required');
});
test('should fail on invalid hash', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [{ collection: 'test', diff: [] }], fields: [], relations: [] },
    };
    const snapshot = { hash: 'xyz' };
    expect(() => validateApplyDiff(diff, snapshot)).toThrowError("Provided hash does not match the current instance's schema hash");
});
describe('should throw accurate error', () => {
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
    test('creating collection which already exists', () => {
        const diff = baseDiff({
            collections: [{ collection: 'test', diff: [{ kind: 'N', rhs: {} }] }],
        });
        const snapshot = baseSnapshot({ collections: [{ collection: 'test' }] });
        expect(() => validateApplyDiff(diff, snapshot)).toThrowError('Provided diff is trying to create collection "test" but it already exists');
    });
    test('deleting collection which does not exist', () => {
        const diff = baseDiff({
            collections: [{ collection: 'test', diff: [{ kind: 'D', lhs: {} }] }],
        });
        expect(() => validateApplyDiff(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete collection "test" but it does not exist');
    });
    test('creating field which already exists', () => {
        const diff = baseDiff({
            fields: [{ collection: 'test', field: 'test', diff: [{ kind: 'N', rhs: {} }] }],
        });
        const snapshot = baseSnapshot({ fields: [{ collection: 'test', field: 'test' }] });
        expect(() => validateApplyDiff(diff, snapshot)).toThrowError('Provided diff is trying to create field "test.test" but it already exists');
    });
    test('deleting field which does not exist', () => {
        const diff = baseDiff({
            fields: [{ collection: 'test', field: 'test', diff: [{ kind: 'D', lhs: {} }] }],
        });
        expect(() => validateApplyDiff(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete field "test.test" but it does not exist');
    });
    test('creating relation which already exists', () => {
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
        expect(() => validateApplyDiff(diff, snapshot)).toThrowError('Provided diff is trying to create relation "test.test-> relation" but it already exists');
    });
    test('deleting relation which does not exist', () => {
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
        expect(() => validateApplyDiff(diff, baseSnapshot())).toThrowError('Provided diff is trying to delete relation "test.test-> relation" but it does not exist');
    });
});
test('should detect empty diff', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [], fields: [], relations: [] },
    };
    const snapshot = {};
    expect(validateApplyDiff(diff, snapshot)).toBe(false);
});
test('should pass on valid diff', () => {
    const diff = {
        hash: 'abc',
        diff: { collections: [{ collection: 'test', diff: [] }], fields: [], relations: [] },
    };
    const snapshot = { hash: 'abc' };
    expect(validateApplyDiff(diff, snapshot)).toBe(true);
});
