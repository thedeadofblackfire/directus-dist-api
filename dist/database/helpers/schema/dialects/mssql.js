"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaHelperMSSQL = void 0;
const types_1 = require("../types");
class SchemaHelperMSSQL extends types_1.SchemaHelper {
    applyLimit(rootQuery, limit) {
        // The ORDER BY clause is invalid in views, inline functions, derived tables, subqueries,
        // and common table expressions, unless TOP, OFFSET or FOR XML is also specified.
        if (limit === -1) {
            rootQuery.limit(Number.MAX_SAFE_INTEGER);
        }
        else {
            rootQuery.limit(limit);
        }
    }
    applyOffset(rootQuery, offset) {
        rootQuery.offset(offset);
        rootQuery.orderBy(1);
    }
    formatUUID(uuid) {
        return uuid.toUpperCase();
    }
}
exports.SchemaHelperMSSQL = SchemaHelperMSSQL;
