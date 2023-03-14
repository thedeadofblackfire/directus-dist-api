"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const vm2_1 = require("vm2");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'exec',
    handler: async ({ code }, { data, env }) => {
        var _a;
        const allowedModules = env.FLOWS_EXEC_ALLOWED_MODULES ? (0, utils_1.toArray)(env.FLOWS_EXEC_ALLOWED_MODULES) : [];
        const allowedEnv = (_a = data.$env) !== null && _a !== void 0 ? _a : {};
        const opts = {
            eval: false,
            wasm: false,
            env: allowedEnv,
        };
        if (allowedModules.length > 0) {
            opts.require = {
                external: {
                    modules: allowedModules,
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
