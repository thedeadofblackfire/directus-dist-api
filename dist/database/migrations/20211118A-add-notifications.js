"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.down = exports.up = void 0;
async function up(knex) {
    await knex.schema.createTable('directus_notifications', (table) => {
        table.increments();
        table.timestamp('timestamp').notNullable();
        table.string('status').defaultTo('inbox');
        table.uuid('recipient').notNullable().references('id').inTable('directus_users').onDelete('CASCADE');
        table.uuid('sender').notNullable().references('id').inTable('directus_users');
        table.string('subject').notNullable();
        table.text('message');
        table.string('collection', 64);
        table.string('item');
    });
    await knex.schema.alterTable('directus_users', (table) => {
        table.boolean('email_notifications').defaultTo(true);
    });
    await knex('directus_users').update({ email_notifications: true });
}
exports.up = up;
async function down(knex) {
    await knex.schema.dropTable('directus_notifications');
    await knex.schema.alterTable('directus_users', (table) => {
        table.dropColumn('email_notifications');
    });
}
exports.down = down;
