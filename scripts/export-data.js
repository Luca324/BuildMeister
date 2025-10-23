#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { getConnection, testConnection, connectionSetting } from './db-connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь для экспорта данных
const exportDir = path.join(__dirname, '..', 'data-export');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

console.log('🚀 Начинаем экспорт данных из EverShop БД...');
console.log(`📁 Директория экспорта: ${exportDir}`);
console.log(`⏰ Временная метка: ${timestamp}`);

// Создаем директорию для экспорта
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// Удаляем создание клиента - будем использовать getConnection()

// Список таблиц для экспорта с их SQL запросами
// Список таблиц для экспорта с их SQL запросами
const exportTables = [
  {
    name: 'settings',
    query: `SELECT * FROM setting`,
    filename: 'settings.csv'
  },
  {
    name: 'categories',
    query: `SELECT * FROM category`,
    filename: 'categories.csv'
  },
  {
    name: 'category_descriptions',
    query: `SELECT * FROM category_description`,
    filename: 'category_descriptions.csv'
  },
  {
    name: 'attributes',
    query: `SELECT * FROM attribute`,
    filename: 'attributes.csv'
  },
  {
    name: 'attribute_options',
    query: `SELECT * FROM attribute_option`,
    filename: 'attribute_options.csv'
  },
  {
    name: 'attribute_groups',
    query: `SELECT * FROM attribute_group`,
    filename: 'attribute_groups.csv'
  },
  {
    name: 'attribute_group_links',
    query: `SELECT * FROM attribute_group_link`,
    filename: 'attribute_group_links.csv'
  },
  {
    name: 'variant_groups',
    query: `SELECT * FROM variant_group`,
    filename: 'variant_groups.csv'
  },
  {
    name: 'collections',
    query: `SELECT * FROM collection`,
    filename: 'collections.csv'
  },
  {
    name: 'products',
    query: `SELECT * FROM product`,
    filename: 'products.csv'
  },
  {
    name: 'product_descriptions',
    query: `SELECT * FROM product_description`,
    filename: 'product_descriptions.csv'
  },
  {
    name: 'product_images',
    query: `SELECT * FROM product_image`,
    filename: 'product_images.csv'
  },
  {
    name: 'product_inventory',
    query: `SELECT * FROM product_inventory`,
    filename: 'product_inventory.csv'
  },
  {
    name: 'product_collections',
    query: `SELECT * FROM product_collection`,
    filename: 'product_collections.csv'
  },
  {
    name: 'product_attribute_values',
    query: `SELECT * FROM product_attribute_value_index`,
    filename: 'product_attribute_values.csv'
  },
  {
    name: 'product_custom_options',
    query: `SELECT * FROM product_custom_option`,
    filename: 'product_custom_options.csv'
  },
  {
    name: 'product_custom_option_values',
    query: `SELECT * FROM product_custom_option_value`,
    filename: 'product_custom_option_values.csv'
  }
];

async function exportTable(tableConfig) {
  let client;
  try {
    console.log(`📊 Экспортируем таблицу: ${tableConfig.name}...`);
    
    client = await getConnection();
    const result = await client.query(tableConfig.query);
    const csvContent = convertToCSV(result.rows, result.fields);
    
    const filePath = path.join(exportDir, tableConfig.filename);
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    console.log(`✅ ${tableConfig.name}: ${result.rows.length} записей экспортировано в ${tableConfig.filename}`);
    return result.rows.length;
  } catch (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log(`⚠️  Таблица ${tableConfig.name} не существует, пропускаем...`);
      return 0;
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

function convertToCSV(rows, fields) {
  if (rows.length === 0) return '';
  
  // Заголовки
  const headers = fields.map(field => field.name).join(',');
  
  // Данные
  const dataRows = rows.map(row => {
    return fields.map(field => {
      const value = row[field.name];
      if (value === null || value === undefined) return '';
      
      let stringValue;
      
      // Обрабатываем даты специальным образом
      if (value instanceof Date) {
        stringValue = value.toISOString(); // Сохраняем в ISO формате
      } else if (typeof value === 'object' && value !== null) {
        // Для объектов (вдруг есть JSON данные)
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      // Экранируем значения содержащие запятые, кавычки или переносы строк
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });
  
  return [headers, ...dataRows].join('\n');
}

async function getTableStats() {
  const stats = {};
  
  for (const table of exportTables) {
    let client;
    try {
      client = await getConnection();
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table.name.split('_')[0]}`);
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

async function main() {
  try {
    console.log('🔌 Тестируем подключение к базе данных...');
    
    // Тестируем подключение
    const isConnected = await testConnection();
    if (!isConnected) {
      process.exit(1);
    }
    
    // Получаем статистику до экспорта
    console.log('\n📈 Статистика данных в БД:');
    const stats = await getTableStats();
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} записей`);
    });
    
    console.log('\n📤 Начинаем экспорт таблиц...');
    let totalExported = 0;
    
    for (const table of exportTables) {
      const count = await exportTable(table);
      totalExported += count;
    }
    
    // Создаем файл с метаинформацией
    const metaInfo = {
      exportDate: new Date().toISOString(),
      database: connectionSetting.database,
      host: connectionSetting.host,
      port: connectionSetting.port,
      tables: stats,
      totalRecords: totalExported
    };
    
    const metaPath = path.join(exportDir, 'export-info.json');
    fs.writeFileSync(metaPath, JSON.stringify(metaInfo, null, 2), 'utf8');
    
    console.log('\n🎉 Экспорт завершен успешно!');
    console.log(`📊 Всего экспортировано записей: ${totalExported}`);
    console.log(`📁 Данные сохранены в: ${exportDir}`);
    console.log(`📄 Метаинформация: export-info.json`);
    
  } catch (error) {
    console.error('❌ Ошибка при экспорте данных:', error.message);
    process.exit(1);
  }
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
  console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...');
  process.exit(0);
});

main();
