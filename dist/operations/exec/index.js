"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const vm2_1 = require("vm2");
const node_module_1 = require("node:module");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'exec',
    handler: async ({ code }, { data, env }) => {
        const allowedModules = env['FLOWS_EXEC_ALLOWED_MODULES'] ? (0, utils_1.toArray)(env['FLOWS_EXEC_ALLOWED_MODULES']) : [];
        const allowedModulesBuiltIn = [];
        const allowedModulesExternal = [];
        const allowedEnv = data['$env'] ?? {};
        const opts = {
            eval: false,
            wasm: false,
            env: allowedEnv,
        };
        for (const module of allowedModules) {
            if ((0, node_module_1.isBuiltin)(module)) {
                allowedModulesBuiltIn.push(module);
            }
            else {
                allowedModulesExternal.push(module);
            }
        }
        if (allowedModules.length > 0) {
            opts.require = {
                builtin: allowedModulesBuiltIn,
                external: {
                    modules: allowedModulesExternal,
                    transitive: false,
                },
            };
        }
        const vm = new vm2_1.NodeVM(opts);
        const script = new vm2_1.VMScript(code).compile();
        const fn = await vm.run(script);
        return await fn(data);
    },
});
