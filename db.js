const { randomUUID } = require('node:crypto');
const knex = require('knex')({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL?.trim(),
    ssl: { rejectUnauthorized: false },
  },
  pool: { min: 0, max: 5 },
});

let schemaReady;

async function ensureSchema() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL must be set to use the PostgreSQL database.');
  }

  if (!schemaReady) {
    schemaReady = (async () => {
      if (!(await knex.schema.hasTable('cases'))) {
        await knex.schema.createTable('cases', table => {
          table.text('id').primary();
          table.text('user_id').notNullable();
          table.text('type_of_punishment').notNullable();
          table.text('account_username').notNullable();
          table.text('account_type').notNullable();
          table.text('reason_for_punishment').notNullable();
          table.text('appeal_text').notNullable();
          table.text('status').notNullable().defaultTo('pending');
          table.timestamp('created_at', { useTz: true }).notNullable();
          table.text('message_id');
          table.text('channel_id');
        });
      }

      if (!(await knex.schema.hasTable('case_actions'))) {
        await knex.schema.createTable('case_actions', table => {
          table.bigIncrements('id').primary();
          table.text('case_id').notNullable()
            .references('id').inTable('cases').onDelete('CASCADE');
          table.text('action').notNullable();
          table.text('action_by').notNullable();
          table.text('reason');
          table.timestamp('created_at', { useTz: true }).notNullable();
        });
      }
    })().catch(error => {
      schemaReady = undefined;
      throw error;
    });
  }

  await schemaReady;
}

async function createCase(
  userId,
  punishmentType,
  reason,
  appealText,
  accountUsername,
  accountType,
) {
  await ensureSchema();
  const id = randomUUID();
  await knex('cases').insert({
    id,
    user_id: userId,
    type_of_punishment: punishmentType,
    account_username: accountUsername,
    account_type: accountType,
    reason_for_punishment: reason,
    appeal_text: appealText,
    created_at: new Date(),
  });
  return id;
}

async function getCase(caseId) {
  await ensureSchema();
  return knex('cases').where({ id: caseId }).first();
}

async function updateCaseStatus(caseId, status, messageId, channelId) {
  await ensureSchema();
  const updated = await knex('cases')
    .where({ id: caseId })
    .update({ status, message_id: messageId, channel_id: channelId });

  if (!updated) {
    throw new Error(`Case ${caseId} was not found.`);
  }
}

async function applyCaseAction(caseId, action, actionBy, reason) {
  await ensureSchema();

  await knex.transaction(async transaction => {
    const updated = await transaction('cases')
      .where({ id: caseId })
      .update({ status: action === 'claim' ? 'claimed' : action })
      .returning('id');

    if (!updated.length) {
      throw new Error(`Case ${caseId} was not found.`);
    }

    await transaction('case_actions').insert({
      case_id: caseId,
      action,
      action_by: actionBy,
      reason,
      created_at: new Date(),
    });
  });
}

module.exports = {
  knex,
  createCase,
  getCase,
  updateCaseStatus,
  applyCaseAction,
};
