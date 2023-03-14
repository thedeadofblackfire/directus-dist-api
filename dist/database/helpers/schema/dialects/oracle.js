"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaHelperOracle = void 0;
const types_1 = require("../types");
class SchemaHelperOracle extends types_1.SchemaHelper {
    async changeToType(table, column, type, options = {}) {
        await this.changeToTypeByCopy(table, column, type, options);
    }
    castA2oPrimaryKey() {
        return 'CAST(?? AS VARCHAR2(255))';
    }
    preRelationChange(relation) {
        var _a;
        if (relation.collection === relation.related_collection) {
            // Constraints are not allowed on self referencing relationships
            // Setting NO ACTION throws - ORA-00905: missing keyword
            if ((_a = relation.schema) === null || _a === void 0 ? void 0 : _a.on_delete) {
                relation.schema.on_delete = null;
            }
        }
    }
    processFieldType(field) {
        var _a, _b, _c, _d;
        if (field.type === 'integer') {
            if (((_a = field.schema) === null || _a === void 0 ? void 0 : _a.numeric_precision) === 20) {
                return 'bigInteger';
            }
            else if (((_b = field.schema) === null || _b === void 0 ? void 0 : _b.numeric_precision) === 1) {
                return 'boolean';
            }
            else if (((_c = field.schema) === null || _c === void 0 ? void 0 : _c.numeric_precision) || ((_d = field.schema) === null || _d === void 0 ? void 0 : _d.numeric_scale)) {
                return 'decimal';
            }
        }
        return field.type;
    }
}
exports.SchemaHelperOracle = SchemaHelperOracle;
