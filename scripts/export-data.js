#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import exportTables from './constants/exportTables.js'
import { convertToCSV } from './utils/convertToCSV.js'
import { logDBStats, logExportStart,logExportSuccess } from './utils/logs.js'
import { getConnection } from './db-connection.js'

// Путь для экспорта данных
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Поддержка кастомной папки экспорта через переменную окружения
const defaultExportDir = path.join(__dirname, '..', 'data-export')
const exportDir = process.env.EXPORT_DIR 
	? (path.isAbsolute(process.env.EXPORT_DIR) 
		? process.env.EXPORT_DIR 
		: path.join(__dirname, '..', process.env.EXPORT_DIR))
	: defaultExportDir
const mediaSourceDir = path.join(__dirname, '..', 'media')
const mediaExportDir = path.join(exportDir, 'media')
const fsp = fs.promises

console.log(`📁 Папка экспорта: ${exportDir}*`)
logExportStart(exportDir)

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

		console.log('\n📤 Начинаем экспорт таблиц...*')
		let totalExported = 0

		for (const table of exportTables) {
			const count = await exportTable(table)
			totalExported += count
		}

		// const mediaCopied = await copyMediaAssets()
		// console.log(`🖼️ Медиафайлы скопированы: ${mediaCopied}*`)

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

async function copyMediaAssets() {
	if (!fs.existsSync(mediaSourceDir)) {
		console.log('⚠️  Каталог media не найден, пропускаем копирование...*')
		return 0
	}

	console.log(`🧭 Старт копирования медиа: ${mediaSourceDir} -> ${mediaExportDir}*`)
	await resetTargetMediaDir()
	const copied = await copyDirectory(mediaSourceDir, mediaExportDir)
	console.log(`📦 Завершено копирование медиа. Всего файлов: ${copied}*`)
	return copied
}

async function resetTargetMediaDir() {
	if (fs.existsSync(mediaExportDir)) {
		console.log(`🧹 Очищаем каталог экспорта медиа: ${mediaExportDir}*`)
		await fsp.rm(mediaExportDir, { recursive: true, force: true })
	}

	console.log(`📁 Создаем корневой каталог для медиа: ${mediaExportDir}*`)
	await fsp.mkdir(mediaExportDir, { recursive: true })
}

async function copyDirectory(source, destination) {
	const entries = await fsp.readdir(source, { withFileTypes: true })
	let copiedFiles = 0
	console.log(`📂 Обрабатываем каталог: ${source} (${entries.length} элементов)*`)

	if (entries.length === 0) {
		console.log(`⚠️  Каталог ${source} пуст, файлов нет для копирования*`)
	}

	for (const entry of entries) {
		const srcPath = path.join(source, entry.name)
		const destPath = path.join(destination, entry.name)

		if (entry.isDirectory()) {
			console.log(`↪️  Входим в подкаталог: ${srcPath}*`)
			await fsp.mkdir(destPath, { recursive: true })
			copiedFiles += await copyDirectory(srcPath, destPath)
		} else if (entry.isFile()) {
			console.log(`📑 Копируем файл: ${srcPath} -> ${destPath}*`)
			await fsp.copyFile(srcPath, destPath)
			copiedFiles += 1
		} else {
			console.log(`🔸 Пропускаем не поддерживаемый объект: ${srcPath}*`)
		}
	}

	return copiedFiles
}

// Обработка сигналов для корректного завершения
process.on('SIGINT', async () => {
	console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...')
	process.exit(0)
})

main()
