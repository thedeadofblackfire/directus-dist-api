"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mssql = exports.mysql = exports.sqlite = exports.oracle = exports.redshift = exports.cockroachdb = exports.postgres = void 0;
var postgres_1 = require("./dialects/postgres");
Object.defineProperty(exports, "postgres", { enumerable: true, get: function () { return postgres_1.GeometryHelperPostgres; } });
var postgres_2 = require("./dialects/postgres");
Object.defineProperty(exports, "cockroachdb", { enumerable: true, get: function () { return postgres_2.GeometryHelperPostgres; } });
var redshift_1 = require("./dialects/redshift");
Object.defineProperty(exports, "redshift", { enumerable: true, get: function () { return redshift_1.GeometryHelperRedshift; } });
var oracle_1 = require("./dialects/oracle");
Object.defineProperty(exports, "oracle", { enumerable: true, get: function () { return oracle_1.GeometryHelperOracle; } });
var sqlite_1 = require("./dialects/sqlite");
Object.defineProperty(exports, "sqlite", { enumerable: true, get: function () { return sqlite_1.GeometryHelperSQLite; } });
var mysql_1 = require("./dialects/mysql");
Object.defineProperty(exports, "mysql", { enumerable: true, get: function () { return mysql_1.GeometryHelperMySQL; } });
var mssql_1 = require("./dialects/mssql");
Object.defineProperty(exports, "mssql", { enumerable: true, get: function () { return mssql_1.GeometryHelperMSSQL; } });
