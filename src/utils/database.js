const { app } = require('electron');
const path = require('path');
const fse = require('fs-extra');
const { logger } = require('./logger');

const dbPath = path.join(app.getPath('userData'), 'filebot.sqlite');

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: dbPath },
  useNullAsDefault: true,
});

const initializeDatabase = async () => {
  try {
    const hasFoldersTable = await knex.schema.hasTable('folders');
    if (!hasFoldersTable) {
      await knex.schema.createTable('folders', table => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('from').notNullable();
        table.string('to').notNullable();
        table.json('rule').notNullable();
        table.json('ignore');
        table.boolean('monitoring').defaultTo(false);
      });
      logger.info('Tabela "folders" criada com sucesso.');
    }

    const hasHistoryTable = await knex.schema.hasTable('action_history');
    if (!hasHistoryTable) {
      await knex.schema.createTable('action_history', table => {
        table.increments('id').primary();
        table.string('folderId').references('id').inTable('folders').onDelete('CASCADE');
        table.string('action_type').notNullable(); // e.g., 'MOVE', 'RENAME'
        table.string('source_path').notNullable();
        table.string('destination_path').notNullable();
        table.string('status').defaultTo('COMPLETED'); // 'COMPLETED', 'REVERTED'
        table.string('details');
        table.timestamp('timestamp').defaultTo(knex.fn.now());
      });
      logger.info('Tabela "action_history" criada com sucesso.');
    }

    const hasRecentPathsTable = await knex.schema.hasTable('recent_paths');
    if (!hasRecentPathsTable) {
      await knex.schema.createTable('recent_paths', table => {
        table.increments('id').primary();
        table.string('path').unique().notNullable();
        table.timestamp('last_used').defaultTo(knex.fn.now());
      });
      logger.info('Tabela "recent_paths" criada com sucesso.');
    }

    const hasRulesTable = await knex.schema.hasTable('rules');
    if (!hasRulesTable) {
      await knex.schema.createTable('rules', table => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.json('ignore');
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      });
      logger.info('Tabela "rules" criada com sucesso.');
    }

    const deleted = await knex('folders').where('ignore', '[object Object]').del();
    if (deleted) logger.info(`Removidos ${deleted} folders antigos com ignore inválido.`);
  } catch (error) {
    logger.error('Erro ao inicializar o banco de dados:', error);
    throw error;
  }
};

const parseFolder = folder => ({
  ...folder,
  rule: typeof folder.rule === 'string' ? JSON.parse(folder.rule) : folder.rule,
  ignore: typeof folder.ignore === 'string' ? JSON.parse(folder.ignore) : folder.ignore,
});

const addFolder = folder => {
  const safeFolder = {
    ...folder,
    rule: JSON.stringify(folder.rule ?? {}),
    ignore: JSON.stringify(folder.ignore ?? []),
  };
  return knex('folders').insert(safeFolder);
};

const updateFolder = (id, updates) => {
  const safeUpdates = {
    ...updates,
    rule: updates.rule ? JSON.stringify(updates.rule) : undefined,
    ignore: updates.ignore ? JSON.stringify(updates.ignore) : undefined,
  };
  return knex('folders').where({ id }).update(safeUpdates);
};

const getFolders = async () => {
  const rows = await knex('folders').select('*');
  return rows.map(parseFolder);
};

const getFolderById = async id => {
  const row = await knex('folders').where({ id }).first();
  return row ? parseFolder(row) : null;
};

const removeFolder = id => knex('folders').where({ id }).del();

const addActionHistory = entry => knex('action_history').insert(entry);
const getActionHistory = () => knex('action_history').orderBy('timestamp', 'desc').limit(200);
const getActionById = actionId =>
  knex('action_history').where({ id: actionId }).first();

const addRecentPath = async path => {
  try {
    await knex('recent_paths')
      .insert({ path, last_used: new Date() })
      .onConflict('path')
      .merge({ last_used: new Date() });
  } catch (error) {
    logger.error(`Erro ao adicionar caminho recente ${path}:`, error);
  }
};

const saveRules = async rules => {
  const safeRules = {
    name: 'global',
    ignore: JSON.stringify(rules.ignore ?? []),
    update_at: new Date(),
  };

  await knex('rules').insert(safeRules).onConflict('name').merge(safeRules);

  logger.info('Regras globais atualizadas com sucesso.');
};

const getRules = async () => {
  const row = await knex('rules')
    .where({
      name: 'global',
    })
    .first();
  if (!row) return { ignore: [] };
  return {
    ...row,
    ignore: typeof row.ignore === 'string' ? JSON.parse(row.ignore) : row.ignore,
  };
};

const getRecentPaths = () =>
  knex('recent_paths').orderBy('last_used', 'desc').limit(10).select('path');

const backupDatabase = async filePath => {
  try {
    const backupData = {
      folders: await knex('folders').select('*'),
      action_history: await knex('action_history').select('*'),
    };
    await fse.writeJson(filePath, backupData, { spaces: 2 });
    logger.info(`Backup do banco de dados criado com sucesso em: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    logger.error('Erro ao criar o backup do banco de dados:', error);
    return { success: false, error };
  }
};

const restoreDatabase = async filePath => {
  try {
    const backupData = await fse.readJson(filePath);
    await knex.transaction(async trx => {
      await trx('action_history').del();
      await trx('folders').del();

      if (backupData.folders?.length) await trx('folders').insert(backupData.folders);
      if (backupData.action_history?.length) await trx('action_history').insert(backupData.action_history);
    });
    logger.info(`Banco de dados restaurado com sucesso de: ${filePath}`);
    return { success: true };
  } catch (error) {
    logger.error('Erro ao restaurar o banco de dados:', error);
    return { success: false, error };
  }
};

module.exports = {
  knex,
  initializeDatabase,
  getFolders,
  addFolder,
  updateFolder,
  removeFolder,
  getFolderById,
  addActionHistory,
  getActionHistory,
  getActionById,
  backupDatabase,
  restoreDatabase,
  addRecentPath,
  getRecentPaths,
  saveRules,
  getRules,
};
