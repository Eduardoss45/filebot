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

// --- Database Initialization ---
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

    const hasHistoryTable = await knex.schema.hasTable('history');
    if (!hasHistoryTable) {
      await knex.schema.createTable('history', table => {
        table.increments('id').primary();
        table.timestamp('timestamp').defaultTo(knex.fn.now());
        table.string('folderId').references('id').inTable('folders').onDelete('CASCADE');
        table.string('fileName');
        table.string('sourcePath');
        table.string('destinationPath');
        table.string('status');
        table.text('details');
      });
      logger.info('Tabela "history" criada com sucesso.');
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

    const deleted = await knex('folders').where('ignore', '[object Object]').del();

    if (deleted) logger.info(`Removidos ${deleted} folders antigos com ignore inválido.`);
  } catch (error) {
    logger.error('Erro ao inicializar o banco de dados:', error);
    throw error;
  }
};

// --- Folder Operations ---
const parseFolder = folder => ({
  ...folder,
  rule: typeof folder.rule === 'string' ? JSON.parse(folder.rule) : folder.rule,
  ignore: typeof folder.ignore === 'string' ? JSON.parse(folder.ignore) : folder.ignore,
});

// Salva folder garantindo JSON válido
const addFolder = folder => {
  const safeFolder = {
    ...folder,
    rule: JSON.stringify(folder.rule ?? {}),
    ignore: JSON.stringify(folder.ignore ?? []),
  };
  return knex('folders').insert(safeFolder);
};

// Atualiza folder garantindo JSON válido
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

// --- History Operations ---
const addHistory = entry => knex('history').insert(entry);
const getHistory = () => knex('history').orderBy('timestamp', 'desc').limit(200);

// --- Recent Paths ---
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

const getRecentPaths = () =>
  knex('recent_paths').orderBy('last_used', 'desc').limit(10).select('path');

// --- Backup & Restore ---
const backupDatabase = async filePath => {
  try {
    const backupData = {
      folders: await knex('folders').select('*'),
      history: await knex('history').select('*'),
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
      await trx('history').del();
      await trx('folders').del();

      if (backupData.folders?.length) await trx('folders').insert(backupData.folders);
      if (backupData.history?.length) await trx('history').insert(backupData.history);
    });
    logger.info(`Banco de dados restaurado com sucesso de: ${filePath}`);
    return { success: true };
  } catch (error) {
    logger.error('Erro ao restaurar o banco de dados:', error);
    return { success: false, error };
  }
};

module.exports = {
  initializeDatabase,
  getFolders,
  addFolder,
  updateFolder,
  removeFolder,
  getFolderById,
  addHistory,
  getHistory,
  backupDatabase,
  restoreDatabase,
  addRecentPath,
  getRecentPaths,
};
