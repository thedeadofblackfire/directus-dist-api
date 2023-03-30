"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemFieldRows = void 0;
//import fse from 'fs-extra';
const lodash_1 = require("lodash");
//import path from 'path';
const get_auth_providers_1 = require("../../../utils/get-auth-providers");
const require_yaml_1 = require("../../../utils/require-yaml");
// @ts-ignore
const format_title_1 = __importDefault(require("@directus/format-title"));
const defaults = (0, require_yaml_1.requireYAML)(require.resolve('./_defaults.yaml'));
//const fieldData = fse.readdirSync(path.resolve(__dirname)); // original
//const fieldData = fse.readdirSync(process.cwd()+'/dist/database/system-data/fields');
const fieldData = [
    "_defaults.yaml",
    "activity.yaml",
    "collections.yaml",
    "dashboards.yaml",
    "fields.yaml",
    "files.yaml",
    "flows.yaml",
    "folders.yaml",
    "index.d.ts",
    "index.js",
    "migrations.yaml",
    "notifications.yaml",
    "operations.yaml",
    "panels.yaml",
    "permissions.yaml",
    "presets.yaml",
    "relations.yaml",
    "revisions.yaml",
    "roles.yaml",
    "sessions.yaml",
    "settings.yaml",
    "shares.yaml",
    "users.yaml",
    "webhooks.yaml"
];
//let fieldData;
//console.log('__cwd__', process.cwd()); // /var/task
//path.join(process.cwd(), targetFile);
/*
if (process.env?.VERCEL || (process.env?.VERCEL_REGION && process.env.VERCEL_REGION == 'dev1')) {
    console.log('systemfields', __dirname, path.resolve('/var/task/dist/database/system-data/fields')); // systemfields /var/task/dist/database/system-data/fields
    console.log('systemfields', __dirname, path.resolve('/var/task/dist/database/system-data/fields'));
    
    //fieldData = fse.readdirSync(process.cwd()+'/dist/database/system-data/fields');
    //fieldData = fse.readdirSync(path.resolve('/var/task/dist/database/system-data/fields'));
    
    fieldData = [
        "_defaults.yaml",
        "activity.yaml",
        "collections.yaml",
        "dashboards.yaml",
        "fields.yaml",
        "files.yaml",
        "flows.yaml",
        "folders.yaml",
        "index.d.ts",
        "index.js",
        "migrations.yaml",
        "notifications.yaml",
        "operations.yaml",
        "panels.yaml",
        "permissions.yaml",
        "presets.yaml",
        "relations.yaml",
        "revisions.yaml",
        "roles.yaml",
        "sessions.yaml",
        "settings.yaml",
        "shares.yaml",
        "users.yaml",
        "webhooks.yaml"
    ]
} else {
    fieldData = fse.readdirSync(path.resolve(__dirname));
}
*/
//console.log('__fieldData__', process.env?.VERCEL_REGION, fieldData);
exports.systemFieldRows = [];
for (const filepath of fieldData) {
    if (filepath.includes('_defaults') || filepath.includes('index'))
        continue;
    //console.log(path.resolve(__dirname, filepath));
    //const systemFields = requireYAML(path.resolve(__dirname, filepath));
    const systemFields = (0, require_yaml_1.requireYAML)(require.resolve('./' + filepath));
    //const systemFields = requireYAML(process.cwd()+'/dist/database/system-data/fields/'+filepath);
    systemFields['fields'].forEach((field, index) => {
        const systemField = (0, lodash_1.merge)({ system: true }, defaults, field, {
            collection: systemFields['table'],
            sort: index + 1,
        });
        // Dynamically populate auth providers field
        if (systemField.collection === 'directus_users' && systemField.field === 'provider') {
            (0, get_auth_providers_1.getAuthProviders)().forEach(({ name }) => {
                systemField.options?.['choices']?.push({
                    text: (0, format_title_1.default)(name),
                    value: name,
                });
            });
        }
        exports.systemFieldRows.push(systemField);
    });
}
