import fs from 'fs'
import path from 'path'

import { getConnection } from '../db-connection.js'

import { parseCSVFile,parseCSVLine } from './parseCSV.js'
import { truncateTable, updateSequence } from './sequenceUtils.js'

export async function importTable(tableConfig, importDir) {
	const filePath = path.join(importDir, tableConfig.filename)
	let client

	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Файл ${tableConfig.filename} не найден, пропускаем...`)
		return 0
	}

	try {
		console.log(`📥 Импортируем таблицу: ${tableConfig.name}...`)

		// Парсим CSV файл
		const { headers: originalHeaders, dataLines } = parseCSVFile(filePath)

		if (dataLines.length === 0) {
			console.log(`⚠️  Файл ${tableConfig.filename} пустой или содержит только заголовки`)
			return 0
		}

		// Исключаем колонки которые не нужно импортировать
		let headers = [...originalHeaders]
		if (tableConfig.excludeColumns) {
			const excludeIndexes = []
			headers = headers.filter((header, index) => {
				if (tableConfig.excludeColumns.includes(header)) {
					excludeIndexes.push(index)
					return false
				}
				return true
			})

			console.log(`   Исключены колонки: ${tableConfig.excludeColumns.join(', ')}`)
		}

		console.log(`   Заголовки для импорта: ${headers.join(', ')}`)
		console.log(`   Количество строк для импорта: ${dataLines.length}`)

		// Получаем соединение с БД
		client = await getConnection()

		// Очищаем таблицу перед импортом
		await truncateTable(tableConfig.name, client)

		// Подготавливаем данные для вставки
		const values = []
		const placeholders = []

		dataLines.forEach((line, lineIndex) => {
			let rowValues = parseCSVLine(line)

			// Исключаем значения для исключенных колонок
			if (tableConfig.excludeColumns) {
				const excludeIndexes = []
				originalHeaders.forEach((header, index) => {
					if (tableConfig.excludeColumns.includes(header)) {
						excludeIndexes.push(index)
					}
				})

				rowValues = rowValues.filter((_, index) => !excludeIndexes.includes(index))
			}

			if (rowValues.length !== headers.length) {
				console.warn(`⚠️  Строка ${lineIndex + 2} имеет неправильное количество полей (${rowValues.length} вместо ${headers.length}), пропускаем...`)
				return
			}

			const rowPlaceholders = headers.map((_, index) => `$${values.length + index + 1}`)
			placeholders.push(`(${rowPlaceholders.join(', ')})`)
			values.push(...rowValues)
		})

		if (values.length === 0) {
			console.log(`⚠️  Нет валидных данных для импорта в ${tableConfig.filename}`)
			return 0
		}

		// Выполняем вставку
		const insertQuery = `
      INSERT INTO ${tableConfig.name} (${headers.join(', ')})
      VALUES ${placeholders.join(', ')}
    `

		const result = await client.query(insertQuery, values)

		console.log(`✅ ${tableConfig.name}: импортировано ${dataLines.length} записей`)

		// Обновляем последовательность если нужно
		if (tableConfig.hasSequence && tableConfig.sequenceName) {
			await updateSequence(tableConfig.sequenceName, tableConfig.name, client)
		}

		return dataLines.length

	} catch (error) {
		console.error(`❌ Ошибка при импорте таблицы ${tableConfig.name}:`, error.message)
		if (error.query) {
			console.error(`   SQL: ${error.query}`)
		}
		throw error
	} finally {
		if (client) {
			client.release()
		}
	}
}

export async function getTableStats(importTables) {
	const stats = {}

	for (const table of importTables) {
		let client
		try {
			client = await getConnection()
			const result = await client.query(`SELECT COUNT(*) as count FROM ${table.name}`)
			stats[table.name] = parseInt(result.rows[0].count)
		} catch (error) {
			stats[table.name] = 0
		} finally {
			if (client) {
				client.release()
			}
		}
	}

	return stats
}

export async function readExportInfo(importDir) {
	const infoPath = path.join(importDir, 'export-info.json')

	if (!fs.existsSync(infoPath)) {
		console.warn('⚠️  Файл export-info.json не найден')
		return null
	}

	try {
		const content = fs.readFileSync(infoPath, 'utf8')
		return JSON.parse(content)
	} catch (error) {
		console.warn('⚠️  Не удалось прочитать export-info.json:', error.message)
		return null
	}
}
