import fs from 'fs'
import path from 'path'

import { getConnection } from '../db-connection.js'

import { parseCSVFile, parseCSVLine } from './parseCSV.js'
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

		const { headers: originalHeaders, dataLines } = parseCSVFile(filePath)

		if (dataLines.length === 0) {
			console.log(`⚠️  Файл ${tableConfig.filename} пустой или содержит только заголовки`)
			return 0
		}

		client = await getConnection()
		// Очищаем таблицу перед импортом
		await truncateTable(tableConfig.name, client)

		// Подготавливаем данные для вставки
		const { values, placeholders, skippedRowsNum } = prepareDataForInsert(tableConfig, originalHeaders, dataLines)

		if (skippedRowsNum > 0) {
			console.warn(`⚠️  Пропущено ${skippedRowsNum} строк из-за ошибок валидации`)
		}

		if (values.length === 0) {
			console.log(`⚠️  Нет валидных данных для импорта в ${tableConfig.filename}`)
			return 0
		}


		const result = await insertData(client, tableConfig, values, placeholders)
		logInsertResult(result.rowCount, tableConfig.name, dataLines.length, skippedRowsNum)

		// Обновляем последовательность
		if (tableConfig.hasSequence && tableConfig.sequenceName) {
			await updateSequence(tableConfig.sequenceName, tableConfig.name, client)
		}

		return result.rowCount || 0

	} catch (error) {
		console.error(`❌ Ошибка при импорте таблицы ${tableConfig.name}:`, error.message)
		logErrorDetails(error)
		throw error
	} finally {
		if (client) {
			client.release()
		}
	}
}

// HELPERS

async function insertData(client, tableConfig, values, placeholders) {
	// Выполняем вставку
	const insertQuery = `
	INSERT INTO ${tableConfig.name} (${tableConfig.headers.join(', ')})
	VALUES ${placeholders.join(', ')}
  `

	const result = await client.query(insertQuery, values)
	return result
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

function prepareDataForInsert(tableConfig, originalHeaders, dataLines) {
	const values = []
	const placeholders = []
	let skippedRowsNum = 0
	// Исключаем колонки которые не нужно импортировать
	let headers = processExcludedColumns(tableConfig, originalHeaders)

	dataLines.forEach((line, lineIndex) => {
		let rowValues = parseCSVLine(line)
		if (!validateRowFIeldsNum(tableConfig, originalHeaders, rowValues, lineIndex, skippedRowsNum)) return
		rowValues = processExcludedColumns(tableConfig, rowValues)

		const rowPlaceholders = headers.map((_, index) => `$${values.length + index + 1}`)
		placeholders.push(`(${rowPlaceholders.join(', ')})`)
		values.push(...rowValues)
	})
	return { values, placeholders, skippedRowsNum }
}

function processExcludedColumns(tableConfig, values) {
	if (tableConfig.excludeColumns) {
		const excludeIndexes = []
		values = values.filter((value, index) => {
			if (tableConfig.excludeColumns.includes(value)) {
				excludeIndexes.push(index)
				return false
			}
			return true
		})
	}
	return values
}

function validateRowFIeldsNum(tableConfig, headers, rowValues, lineIndex, skippedRowsNum) {
	if (rowValues.length !== headers.length) {
		console.warn(`⚠️  Строка ${lineIndex + 2} имеет неправильное количество полей (${rowValues.length} вместо ${headers.length}), пропускаем...`)
		skippedRowsNum++
		return false
	}
	return true
}

function logInsertResult(resultRowsNum, tableName, dataLinesLength, skippedRowsNum) {
	console.log('result.rowCount', resultRowsNum)

	// Рассчитываем ожидаемое количество с учетом пропущенных строк
	const expectedCount = dataLinesLength - skippedRowsNum

	// Проверяем, что все строки были вставлены
	if (resultRowsNum !== expectedCount) {
		console.warn(`⚠️  ${tableName}: ожидалось вставить ${expectedCount} записей, но вставлено только ${resultRowsNum}`)
	}

	console.log(`✅ ${tableName}: импортировано ${resultRowsNum} записей *`)
}

function logErrorDetails(error) {
	if (error.query) {
		console.error(`   SQL: ${error.query}`)
	}
	if (error.detail) {
		console.error(`   Детали: ${error.detail}`)
	}
	if (error.hint) {
		console.error(`   Подсказка: ${error.hint}`)
	}
	if (error.code) {
		console.error(`   Код ошибки: ${error.code}`)
	}
}
