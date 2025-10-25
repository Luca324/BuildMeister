#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import exportTables from './constants/exportTables.js'
import { convertToCSV } from './utils/convertToCSV.js'
import { logDBStats, logExportSuccess } from './utils/logs.js'
import { getConnection, testConnection } from './db-connection.js'

// Путь для экспорта данных
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const exportDir = path.join(__dirname, '..', 'data-export')

logExportStart(exportDir);

// Создаем директорию для экспорта
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true })
}

async function main() {
  try {
    // console.log('🔌 Тестируем подключение к базе данных...')

    // // Тестируем подключение
    // const isConnected = await testConnection()
    // if (!isConnected) process.exit(1)

    await logDBStats()

    console.log('\n📤 Начинаем экспорт таблиц...')
    let totalExported = 0

    for (const table of exportTables) {
      const count = await exportTable(table)
      totalExported += count
    }

    logExportSuccess(totalExported, exportDir)
  } catch (error) {
    console.error('❌ Ошибка при экспорте данных:', error.message)
    process.exit(1)
  }
}
async function exportTable(tableConfig) {
  let client
  try {
    console.log(`📊 Экспортируем таблицу: ${tableConfig.name}...`)

    client = await getConnection()
    const result = await client.query(tableConfig.query)
    const csvContent = convertToCSV(result.rows, result.fields)

    const filePath = path.join(exportDir, tableConfig.filename)
    fs.writeFileSync(filePath, csvContent, 'utf8')

    console.log(`✅ ${tableConfig.name}: ${result.rows.length} записей экспортировано в ${tableConfig.filename}`)
    return result.rows.length
  } catch (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log(`⚠️  Таблица ${tableConfig.name} не существует, пропускаем...`)
      return 0
    }

    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
  console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...')
  process.exit(0)
})

main()
