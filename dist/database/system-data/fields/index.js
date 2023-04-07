import fse from 'fs-extra';
import { merge } from 'lodash-es';
import path from 'path';
import { getAuthProviders } from '../../../utils/get-auth-providers.js';
import { requireYAML } from '../../../utils/require-yaml.js';
import formatTitle from '@directus/format-title';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//const defaults = requireYAML(require.resolve('./_defaults.yaml')); // previous version works
const defaults = requireYAML(path.join(__dirname, './_defaults.yaml'));
const fieldData = fse.readdirSync(path.resolve(__dirname)); // original
/*
const fieldData = fse.readdirSync(process.cwd()+'/dist/database/system-data/fields');
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
*/
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
export const systemFieldRows = [];
for (const filepath of fieldData) {
    if (filepath.includes('_defaults') || filepath.includes('index'))
        continue;
    const systemFields = requireYAML(path.resolve(__dirname, filepath)); // original
    //const systemFields = requireYAML(require.resolve('./'+filepath));
    systemFields['fields'].forEach((field, index) => {
        const systemField = merge({ system: true }, defaults, field, {
            collection: systemFields['table'],
            sort: index + 1,
        });
        // Dynamically populate auth providers field
        if (systemField.collection === 'directus_users' && systemField.field === 'provider') {
            getAuthProviders().forEach(({ name }) => {
                systemField.options?.['choices']?.push({
                    text: formatTitle(name),
                    value: name,
                });
            });
        }
        systemFieldRows.push(systemField);
    });
}
