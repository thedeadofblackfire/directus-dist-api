export async function up(knex) {
    await knex.schema.alterTable('directus_activity', (table) => {
        table.string('origin').nullable();
    });
    await knex.schema.alterTable('directus_sessions', (table) => {
        table.string('origin').nullable();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('directus_activity', (table) => {
        table.dropColumn('origin');
    });
    await knex.schema.alterTable('directus_sessions', (table) => {
        table.dropColumn('origin');
    });
}
