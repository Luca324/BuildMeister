#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import importTables from './constants/importTables.js'
import { getTableStats, importTable, readExportInfo } from './utils/importUtils.js'
import logImportData from './utils/logImportData.js'
import { logImportStart, logImportStats, logImportStatsAfter,logImportSuccess } from './utils/logs.js'
import { testConnection } from './db-connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Путь к данным для импорта
const importDir = path.join(__dirname, '..', 'data-export')

// Проверяем существование директории с данными
if (!fs.existsSync(importDir)) {
	console.error(`❌ Директория с данными не найдена: ${importDir}`)
	console.error('💡 Сначала выполните экспорт данных командой: npm run db:export')
	process.exit(1)
}

logImportStart(importDir)

async function main() {
	try {
		console.log('🔌 Тестируем подключение к базе данных...')

		// Тестируем подключение
		const isConnected = await testConnection()
		if (!isConnected) process.exit(1)

		// Читаем информацию об экспорте
		const exportInfo = await readExportInfo(importDir)
		if (exportInfo) {
			console.log(`📅 Дата экспорта: ${exportInfo.exportDate}`)
			console.log(`🗄️  Исходная БД: ${exportInfo.database}@${exportInfo.host}:${exportInfo.port}`)
		}

		// Получаем статистику до импорта
		await logImportStats(importTables)
		const statsBefore = await getTableStats(importTables)

		console.log('\n📤 Начинаем импорт таблиц...')
		let totalImported = 0

		for (const table of importTables) {
			const count = await importTable(table, importDir)
			totalImported += count
		}

		// Получаем статистику после импорта
		const statsAfter = await getTableStats(importTables)
		logImportStatsAfter(statsAfter, statsBefore)

		logImportSuccess(totalImported, importDir)
		logImportData(totalImported, importDir)

	} catch (error) {
		console.error('❌ Ошибка при импорте данных:', error.message)
		process.exit(1)
	}
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
	console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...')
	process.exit(0)
})

main()
