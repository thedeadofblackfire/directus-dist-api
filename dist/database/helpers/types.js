"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseHelper = void 0;
class DatabaseHelper {
    knex;
    constructor(knex) {
        this.knex = knex;
    }
}
exports.DatabaseHelper = DatabaseHelper;
