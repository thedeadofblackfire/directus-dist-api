"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_keys_1 = require("../../src/utils/validate-keys");
const uuid_1 = require("uuid");
const vitest_1 = require("vitest");
const schema = {
    collections: {
        pk_integer: {
            collection: 'pk_integer',
            primary: 'id',
            singleton: false,
            note: 'Sample schema with integer primary key',
            sortField: null,
            accountability: null,
            fields: {
                id: {
                    field: 'id',
                    defaultValue: null,
                    nullable: false,
                    generated: false,
                    type: 'integer',
                    dbType: 'integer',
                    precision: null,
                    scale: null,
                    special: [],
                    note: null,
                    alias: false,
                    validation: null,
                },
            },
        },
        pk_uuid: {
            collection: 'pk_uuid',
            primary: 'id',
            singleton: false,
            note: 'Sample schema with uuid primary key',
            sortField: null,
            accountability: null,
            fields: {
                id: {
                    field: 'id',
                    defaultValue: null,
                    nullable: false,
                    generated: false,
                    type: 'uuid',
                    dbType: 'uuid',
                    precision: null,
                    scale: null,
                    special: [],
                    note: null,
                    alias: false,
                    validation: null,
                },
            },
        },
    },
    relations: [],
};
(0, vitest_1.describe)('validate keys', () => {
    (0, vitest_1.describe)('of integer type', () => {
        (0, vitest_1.it)('Throws an error when provided with an invalid integer key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', 'invalid')).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', NaN)).toThrowError();
        });
        (0, vitest_1.it)('Throws an error when provided with an array containing an invalid integer key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', [111, 'invalid', 222])).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', [555, NaN, 666])).toThrowError();
        });
        (0, vitest_1.it)('Does not throw an error when provided with a valid integer key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', 111)).not.toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', '222')).not.toThrowError();
        });
        (0, vitest_1.it)('Does not throw an error when provided with an array of valid integer keys', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', [111, 222, 333])).not.toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_integer', 'id', ['444', '555', '666'])).not.toThrowError();
        });
    });
    (0, vitest_1.describe)('of uuid type', () => {
        (0, vitest_1.it)('Throws an error when provided with an invalid uuid key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', 'fakeuuid-62d9-434d-a7c7-878c8376782e')).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', 'invalid')).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', NaN)).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', 111)).toThrowError();
        });
        (0, vitest_1.it)('Throws an error when provided with an array containing an invalid uuid key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', [(0, uuid_1.v4)(), 'fakeuuid-62d9-434d-a7c7-878c8376782e', (0, uuid_1.v4)()])).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', [(0, uuid_1.v4)(), 'invalid', (0, uuid_1.v4)()])).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', [(0, uuid_1.v4)(), NaN, (0, uuid_1.v4)()])).toThrowError();
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', [(0, uuid_1.v4)(), 111, (0, uuid_1.v4)()])).toThrowError();
        });
        (0, vitest_1.it)('Does not throw an error when provided with a valid uuid key', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', (0, uuid_1.v4)())).not.toThrowError();
        });
        (0, vitest_1.it)('Does not throw an error when provided with an array of valid uuid keys', () => {
            (0, vitest_1.expect)(() => (0, validate_keys_1.validateKeys)(schema, 'pk_uuid', 'id', [(0, uuid_1.v4)(), (0, uuid_1.v4)(), (0, uuid_1.v4)()])).not.toThrowError();
        });
    });
});
