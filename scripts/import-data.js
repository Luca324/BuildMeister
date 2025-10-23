#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTableQueries } from './create-tables-script.js';
import { getConnection, testConnection } from './db-connection.js';
import { importTables } from './importTables.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к данным для импорта
const importDir = path.join(__dirname, '..', 'data-export');

console.log('🚀 Начинаем импорт данных в EverShop БД...');
console.log(`📁 Директория импорта: ${importDir}`);

// Проверяем существование директории с данными
if (!fs.existsSync(importDir)) {
  console.error(`❌ Директория с данными не найдена: ${importDir}`);
  console.error('💡 Сначала выполните экспорт данных командой: npm run db:export');
  process.exit(1);
}



async function truncateTable(tableName, client) {
  try {
    await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
    console.log(`🗑️  Очищена таблица: ${tableName}`);
  } catch (error) {
    console.warn(`⚠️  Не удалось очистить таблицу ${tableName}:`, error.message);
  }
}

async function importTable(tableConfig) {
  const filePath = path.join(importDir, tableConfig.filename);
  let client;
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Файл ${tableConfig.filename} не найден, пропускаем...`);
    return 0;
  }
  
  try {
    console.log(`📥 Импортируем таблицу: ${tableConfig.name}...`);
    
    // Читаем CSV файл
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    if (lines.length <= 1) {
      console.log(`⚠️  Файл ${tableConfig.filename} пустой или содержит только заголовки`);
      return 0;
    }
    
    // Получаем заголовки
    let headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dataLines = lines.slice(1);
    
    if (dataLines.length === 0) {
      console.log(`⚠️  Нет данных для импорта в ${tableConfig.filename}`);
      return 0;
    }
    
    // Исключаем колонки которые не нужно импортировать
    if (tableConfig.excludeColumns) {
      const excludeIndexes = [];
      headers = headers.filter((header, index) => {
        if (tableConfig.excludeColumns.includes(header)) {
          excludeIndexes.push(index);
          return false;
        }
        return true;
      });
      
      console.log(`   Исключены колонки: ${tableConfig.excludeColumns.join(', ')}`);
    }
    
    console.log(`   Заголовки для импорта: ${headers.join(', ')}`);
    console.log(`   Количество строк для импорта: ${dataLines.length}`);
    
    // Получаем соединение с БД
    client = await getConnection();
    
    // Очищаем таблицу если нужно
    if (tableConfig.truncate) {
      await truncateTable(tableConfig.name, client);
    }
    
    // Подготавливаем данные для вставки
    const values = [];
    const placeholders = [];
    
    dataLines.forEach((line, lineIndex) => {
      let rowValues = parseCSVLine(line);
      
      // Исключаем значения для исключенных колонок
      if (tableConfig.excludeColumns) {
        const excludeIndexes = [];
        const originalHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        originalHeaders.forEach((header, index) => {
          if (tableConfig.excludeColumns.includes(header)) {
            excludeIndexes.push(index);
          }
        });
        
        rowValues = rowValues.filter((_, index) => !excludeIndexes.includes(index));
      }
      
      if (rowValues.length !== headers.length) {
        console.warn(`⚠️  Строка ${lineIndex + 2} имеет неправильное количество полей (${rowValues.length} вместо ${headers.length}), пропускаем...`);
        return;
      }
      
      const rowPlaceholders = headers.map((_, index) => `$${values.length + index + 1}`);
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
      values.push(...rowValues);
    });
    
    if (values.length === 0) {
      console.log(`⚠️  Нет валидных данных для импорта в ${tableConfig.filename}`);
      return 0;
    }
    
    // Выполняем вставку
    const insertQuery = `
      INSERT INTO ${tableConfig.name} (${headers.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;
    
    const result = await client.query(insertQuery, values);
    
    console.log(`✅ ${tableConfig.name}: импортировано ${dataLines.length} записей`);
    
    // Обновляем последовательность если нужно
    if (tableConfig.hasSequence && tableConfig.sequenceName) {
      await updateSequence(tableConfig.sequenceName, tableConfig.name, client);
    }
    
    return dataLines.length;
    
  } catch (error) {
    console.error(`❌ Ошибка при импорте таблицы AAAAAAAA ${tableConfig.name}:`, error.message);
    if (error.query) {
      console.error(`   SQL: ${error.query}`);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Экранированная кавычка
        current += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        // Начало или конец строки в кавычках
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  
  // Очищаем значения от лишних кавычек и пробелов
  return values.map(val => {
    let cleaned = val.trim();
    // Убираем окружающие кавычки если есть
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    // Заменяем двойные кавычки на одинарные
    cleaned = cleaned.replace(/""/g, '"');
    // Обрабатываем пустые значения
    if (cleaned === '' || cleaned === 'NULL') {
      return null;
    }
    return cleaned;
  });
}

async function updateSequence(sequenceName, tableName, client) {
  try {
    const primaryKeyColumn = getPrimaryKeyColumn(tableName);
    const query = `
      SELECT setval('${sequenceName}', COALESCE((SELECT MAX(${primaryKeyColumn}) FROM ${tableName}), 1), true)
    `;
    await client.query(query);
    console.log(`🔄 Обновлена последовательность: ${sequenceName}`);
  } catch (error) {
    console.warn(`⚠️  Не удалось обновить последовательность ${sequenceName}:`, error.message);
  }
}

function getPrimaryKeyColumn(tableName) {
  // Определяем имя первичного ключа на основе имени таблицы
  const keyMap = {
    'setting': 'setting_id',
    'attribute': 'attribute_id',
    'attribute_option': 'attribute_option_id',
    'attribute_group': 'attribute_group_id',
    'variant_group': 'variant_group_id',
    'category': 'category_id',
    'collection': 'collection_id',
    'product': 'product_id',
    'product_custom_option': 'product_custom_option_id',
    'product_custom_option_value': 'product_custom_option_value_id'
  };
  
  return keyMap[tableName] || `${tableName.split('_')[0]}_id`;
}

async function getTableStats() {
  const stats = {};
  
  for (const table of importTables) {
    let client;
    try {
      client = await getConnection();
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table.name}`);
      stats[table.name] = parseInt(result.rows[0].count);
    } catch (error) {
      stats[table.name] = 0;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
  
  return stats;
}

async function readExportInfo() {
  const infoPath = path.join(importDir, 'export-info.json');
  
  if (!fs.existsSync(infoPath)) {
    console.warn('⚠️  Файл export-info.json не найден');
    return null;
  }
  
  try {
    const content = fs.readFileSync(infoPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Не удалось прочитать export-info.json:', error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('🔌 Тестируем подключение к базе данных...');
    
    // Тестируем подключение
    const isConnected = await testConnection();
    if (!isConnected) {
      process.exit(1);
    }

    await createTablesIfNotExist();
    
    // Читаем информацию об экспорте
    const exportInfo = await readExportInfo();
    if (exportInfo) {
      console.log(`📅 Дата экспорта: ${exportInfo.exportDate}`);
      console.log(`🗄️  Исходная БД: ${exportInfo.database}@${exportInfo.host}:${exportInfo.port}`);
    }
    
    // Получаем статистику до импорта
    console.log('\n📈 Статистика данных в БД до импорта:');
    const statsBefore = await getTableStats();
    Object.entries(statsBefore).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} записей`);
    });
    
    console.log('\n📤 Начинаем импорт таблиц...');
    let totalImported = 0;
    
    for (const table of importTables) {
      const count = await importTable(table);
      totalImported += count;
    }
    
    // Получаем статистику после импорта
    console.log('\n📈 Статистика данных в БД после импорта:');
    const statsAfter = await getTableStats();
    Object.entries(statsAfter).forEach(([table, count]) => {
      const before = statsBefore[table] || 0;
      const diff = count - before;
      console.log(`   ${table}: ${count} записей (${diff > 0 ? '+' : ''}${diff})`);
    });
    
    console.log('\n🎉 Импорт завершен успешно!');
    console.log(`📊 Всего импортировано записей: ${totalImported}`);
    
  } catch (error) {
    console.error('❌ Ошибка при импорте данных:', error.message);
    process.exit(1);
  }
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
  console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...');
  process.exit(0);
});

async function createTablesIfNotExist() {
  let client;
  try {
    console.log('🔍 Проверяем существование таблиц...');
    client = await getConnection();
    
    for (const query of createTableQueries) {
      await client.query(query);
    }
    
    console.log('✅ Проверка/создание таблиц завершена');
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

main();