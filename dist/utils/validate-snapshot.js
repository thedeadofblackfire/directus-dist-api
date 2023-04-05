import { version as currentDirectusVersion } from './package.js';
import { InvalidPayloadException } from '../exceptions/invalid-payload.js';
import { getDatabaseClient } from '../database/index.js';
import Joi from 'joi';
import { TYPES } from '@directus/constants';
import { ALIAS_TYPES } from '../constants.js';
import { DatabaseClients } from '../types/index.js';
const snapshotJoiSchema = Joi.object({
    version: Joi.number().valid(1).required(),
    directus: Joi.string().required(),
    vendor: Joi.string()
        .valid(...DatabaseClients)
        .optional(),
    collections: Joi.array().items(Joi.object({
        collection: Joi.string(),
        meta: Joi.any(),
        schema: Joi.object({
            name: Joi.string(),
        }),
    })),
    fields: Joi.array().items(Joi.object({
        collection: Joi.string(),
        field: Joi.string(),
        meta: Joi.any(),
        schema: Joi.object({
            default_value: Joi.any(),
            max_length: [Joi.number(), Joi.string(), Joi.valid(null)],
            is_nullable: Joi.bool(),
        })
            .unknown()
            .allow(null),
        type: Joi.string()
            .valid(...TYPES, ...ALIAS_TYPES)
            .allow(null),
    })),
    relations: Joi.array().items(Joi.object({
        collection: Joi.string(),
        field: Joi.string(),
        meta: Joi.any(),
        related_collection: Joi.any(),
        schema: Joi.any(),
    })),
});
/**
 * Validates the snapshot against the current instance.
 **/
export function validateSnapshot(snapshot, force = false) {
    const { error } = snapshotJoiSchema.validate(snapshot);
    if (error)
        throw new InvalidPayloadException(error.message);
    // Bypass checks when "force" option is enabled
    if (force)
        return;
    if (snapshot.directus !== currentDirectusVersion) {
        throw new InvalidPayloadException(`Provided snapshot's directus version ${snapshot.directus} does not match the current instance's version ${currentDirectusVersion}. You can bypass this check by passing the "force" query parameter.`);
    }
    if (!snapshot.vendor) {
        throw new InvalidPayloadException('Provided snapshot does not contain the "vendor" property. You can bypass this check by passing the "force" query parameter.');
    }
    const currentVendor = getDatabaseClient();
    if (snapshot.vendor !== currentVendor) {
        throw new InvalidPayloadException(`Provided snapshot's vendor ${snapshot.vendor} does not match the current instance's vendor ${currentVendor}. You can bypass this check by passing the "force" query parameter.`);
    }
}
