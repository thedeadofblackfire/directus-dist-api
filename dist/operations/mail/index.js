"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@directus/shared/utils");
const services_1 = require("../../services");
const md_1 = require("../../utils/md");
exports.default = (0, utils_1.defineOperationApi)({
    id: 'mail',
    handler: async ({ body, to, type, subject }, { accountability, database, getSchema }) => {
        const mailService = new services_1.MailService({ schema: await getSchema({ database }), accountability, knex: database });
        // If 'body' is of type object/undefined (happens when body consists solely of a placeholder)
        // convert it to JSON string
        const safeBody = typeof body !== 'string' ? JSON.stringify(body) : body;
        await mailService.send({
            html: type === 'wysiwyg' ? safeBody : (0, md_1.md)(safeBody),
            to,
            subject,
        });
    },
});
