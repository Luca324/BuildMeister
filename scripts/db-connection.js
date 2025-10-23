import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { Pool } from 'pg';

import { logconnectionSetting, logError } from './utils/logs.js';
import { setSslMode } from './utils/ssl_mode.js';
// Загружаем переменные окружения из .env в корне проекта

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '..', '.env');

const dotenvResult = dotenv.config({ path: rootEnvPath });
if (dotenvResult.error) {
  console.warn(`⚠️  .env не найден или не прочитан по пути: ${rootEnvPath}`);
} else {
  console.log(`🧩 .env загружен: ${rootEnvPath}`);
}
// Диагностика переменных окружения
const envSnapshot = {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
  DB_SSLMODE: process.env.DB_SSLMODE
};
console.log('🔎 ENV переменные (частично замаскированы):', envSnapshot);

// Функция для чтения конфигурации из config/default.json
function getConfig(path, defaultValue = null) {
  try {
    const configPath = new URL('../config/default.json', import.meta.url);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const keys = path.split('.');
    let value = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  } catch (error) {
    console.warn(`⚠️  Не удалось прочитать конфигурацию из ${path}:`, error.message);
    return defaultValue;
  }
}

// Настройки подключения к БД (как в официальном EverShop)
const connectionSetting = {
  host: process.env.DB_HOST || getConfig('system.database.host') || 'database',
  port:
    parseInt(process.env.DB_PORT) ||
    parseInt(getConfig('system.database.port')) ||
    5432,
  user: process.env.DB_USER || getConfig('system.database.user') || 'postgres',
  password: process.env.DB_PASSWORD || getConfig('system.database.password') || 'postgres',
  database: process.env.DB_NAME || getConfig('system.database.database') || 'postgres',
  max: 20
};

// Поддержка SSL (как в официальном EverShop)
const sslMode = process.env.DB_SSLMODE || getConfig('system.database.ssl_mode');
setSslMode(sslMode, connectionSetting)

const pool = new Pool(connectionSetting);

// Устанавливаем часовой пояс (как в официальном EverShop)
pool.on('connect', (client) => {
  const timeZone = getConfig('shop.timezone', 'UTC');
  client.query(`SET TIMEZONE TO "${timeZone}";`);
});

async function getConnection() {
  return await pool.connect();
}

// Функция для получения клиента напрямую
function getClient() {
  return pool;
}

// Функция для тестирования подключения
async function testConnection() {
  try {
    logconnectionSetting(connectionSetting)
    const client = await getConnection();
    const result = await client.query('SELECT NOW() as current_time');
    await client.release();

    console.log('✅ Подключение к БД успешно установлено');
    console.log(`🕐 Время БД: ${result.rows[0].current_time}`);
    console.log(`🗄️  База данных: ${connectionSetting.database}@${connectionSetting.host}:${connectionSetting.port}`);

    return true;
  } catch (error) {
    logError(error)

    return false;
  }
}

export { pool, getConnection, getClient, testConnection, connectionSetting };
