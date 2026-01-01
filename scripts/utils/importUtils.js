import fs from 'fs'
import path from 'path'

import { getConnection } from '../db-connection.js'

import { parseCSVFile, parseCSVLine } from './parseCSV.js'
import { updateSequence, quoteIdentifier } from './sequenceUtils.js'

export async function importTable(tableConfig, importDir) {
	const filePath = path.join(importDir, tableConfig.filename)
	let client

	if (!fs.existsSync(filePath)) {
		console.log(`⚠️  Файл ${tableConfig.filename} не найден, пропускаем...`)
		return 0
	}

	try {
		console.log(`📥 Импортируем таблицу: ${tableConfig.name}...*`)

		const { headers: originalHeaders, dataLines } = parseCSVFile(filePath)

		if (dataLines.length === 0) {
			console.log(`⚠️  Файл ${tableConfig.filename} пустой или содержит только заголовки`)
			return 0
		}

		client = await getConnection()

		// Используем явную транзакцию для всех операций
		await client.query('BEGIN')

		try {
			// Очищаем таблицу перед импортом
			// Используем SAVEPOINT, чтобы можно было откатиться при ошибке truncate
			/*
			try {
				await client.query('SAVEPOINT before_truncate')
				await truncateTable(tableConfig.name, client)
				await client.query('RELEASE SAVEPOINT before_truncate')
			} catch (truncateError) {
				// Если truncate не удался, откатываемся до savepoint и продолжаем
				try {
					await client.query('ROLLBACK TO SAVEPOINT before_truncate')
					console.warn(`⚠️  Не удалось очистить таблицу ${tableConfig.name}, продолжаем импорт без очистки`)
				} catch (rollbackError) {
					// Если и откат не удался, значит транзакция сломана, нужно начать заново
					if (rollbackError.code === '25P02' || truncateError.code === '25P02') {
						await client.query('ROLLBACK')
						await client.query('BEGIN')
						console.warn(`⚠️  Транзакция была перезапущена из-за ошибки truncate для ${tableConfig.name}`)
					} else {
						throw rollbackError
					}
				}
			}
				*/

			// Подготавливаем данные для вставки
			const { values, placeholders, skippedRowsNum, headers } = prepareDataForInsert(tableConfig, originalHeaders, dataLines)

			if (skippedRowsNum > 0) {
				console.warn(`⚠️  Пропущено ${skippedRowsNum} строк из-за ошибок валидации`)
			}

			if (values.length === 0) {
				// Откатываем транзакцию, если нет данных
				await client.query('ROLLBACK')
				console.log(`⚠️  Нет валидных данных для импорта в ${tableConfig.filename}`)
				return 0
			}

			const result = await insertData(client, tableConfig, values, placeholders, headers)

			// Явно проверяем, что данные действительно вставлены СРАЗУ после INSERT
			const quotedTableName = quoteIdentifier(tableConfig.name)
			const verifyResultBeforeSequence = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
			const actualCountBeforeSequence = parseInt(verifyResultBeforeSequence.rows[0].count)

			// Обновляем последовательность
			let actualCountAfterSequence = actualCountBeforeSequence
			if (tableConfig.hasSequence && tableConfig.sequenceName) {
				try {
					await updateSequence(tableConfig.sequenceName, tableConfig.name, client)
					// Проверяем еще раз после updateSequence
					const verifyResultAfterSequence = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
					actualCountAfterSequence = parseInt(verifyResultAfterSequence.rows[0].count)
				} catch (seqError) {
					console.error(`❌ Ошибка при обновлении последовательности для ${tableConfig.name}:`, seqError.message)
					// Проверяем, не исчезли ли данные после ошибки
					const verifyResultAfterError = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
					actualCountAfterSequence = parseInt(verifyResultAfterError.rows[0].count)
					// Ошибка в sequence не критична, продолжаем
				}
			}

			// Коммитим транзакцию ЯВНО
			await client.query('COMMIT')

			// Проверяем после коммита с НОВЫМ запросом
			const verifyResultAfterCommit = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
			const actualCountAfterCommit = parseInt(verifyResultAfterCommit.rows[0].count)

			logInsertResult(result.rowCount, tableConfig.name, dataLines.length, skippedRowsNum, actualCountBeforeSequence, actualCountAfterSequence, actualCountAfterCommit)

			// Дополнительная проверка: используем НОВОЕ подключение для проверки
			const verifyClient = await getConnection()
			try {
				const verifyResultNewConnection = await verifyClient.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
				const actualCountNewConnection = parseInt(verifyResultNewConnection.rows[0].count)
				if (actualCountAfterCommit !== actualCountNewConnection) {
					console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${tableConfig.name}: данные видны в текущем connection (${actualCountAfterCommit}), но не видны в новом connection (${actualCountNewConnection})!`)
					console.error('   Это означает проблему с изоляцией транзакций или коммитом!')
				}
			} finally {
				verifyClient.release()
			}

			return result.rowCount || 0

		} catch (transactionError) {
			// Откатываем транзакцию при ошибке
			try {
				await client.query('ROLLBACK')
			} catch (rollbackError) {
				console.error(`❌ Ошибка при откате транзакции для ${tableConfig.name}:`, rollbackError.message)
			}
			throw transactionError
		}

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

async function insertData(client, tableConfig, values, placeholders, headers) {

	// console.log('headers*', headers.join(', '))
	// console.log('values*', values.join(', '))
	// Таблицы, которые имеют уникальный индекс на uuid для ON CONFLICT
	// Для остальных используем обычный INSERT
	const tablesWithUuidUnique = [
		'category', 'product', 'attribute', 'attribute_option', 'attribute_group', 'collection',
		'customer', 'admin_user', 'cart', 'order', 'cms_page', 'coupon', 'tax_class',
	]

	const hasUuid = headers.includes('uuid')
	const canUseOnConflict = hasUuid && tablesWithUuidUnique.includes(tableConfig.name)
	const overridingClause = tableConfig.overrideIdentity ? 'OVERRIDING SYSTEM VALUE' : ''
	const identityColumns = tableConfig.identityColumns ?? []

	// Строим запрос с ON CONFLICT для обработки дубликатов
	const quotedTableName = quoteIdentifier(tableConfig.name)
	const quotedHeaders = headers.map(h => quoteIdentifier(h))
	
	let insertQuery
	if (canUseOnConflict) {
		// Если есть uuid и таблица поддерживает ON CONFLICT, используем его
		const updatableColumns = headers.filter((h) => h !== 'uuid' && h !== 'created_at' && !identityColumns.includes(h))
		if (updatableColumns.length > 0) {
			const updateColumns = updatableColumns.map(h => `${quoteIdentifier(h)} = EXCLUDED.${quoteIdentifier(h)}`).join(', ')
			insertQuery = `
			INSERT INTO ${quotedTableName} (${quotedHeaders.join(', ')})
			${overridingClause}
			VALUES ${placeholders.join(', ')}
			ON CONFLICT (${quoteIdentifier('uuid')}) DO UPDATE SET ${updateColumns}
		  `
		} else {
			insertQuery = `
			INSERT INTO ${quotedTableName} (${quotedHeaders.join(', ')})
			${overridingClause}
			VALUES ${placeholders.join(', ')}
			ON CONFLICT (${quoteIdentifier('uuid')}) DO NOTHING
		  `
		}
	} else {
		// Обычный INSERT без ON CONFLICT
		insertQuery = `
		INSERT INTO ${quotedTableName} (${quotedHeaders.join(', ')})
		${overridingClause}
		VALUES ${placeholders.join(', ')}
	  `
	}

	const result = await client.query(insertQuery, values)
	return result
}

export async function getTableStats(importTables) {
	const stats = {}

	for (const table of importTables) {
		let client
		try {
			client = await getConnection()
			const quotedTableName = quoteIdentifier(table.name)
			const result = await client.query(`SELECT COUNT(*) as count FROM ${quotedTableName}`)
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
	let headers = processExcludedHeaders(tableConfig, originalHeaders)

	dataLines.forEach((line, lineIndex) => {
		let rowValues = parseCSVLine(line)
		if (!validateRowFIeldsNum(originalHeaders, rowValues, lineIndex)) {
			skippedRowsNum++
			return
		}
		rowValues = processExcludedRowValues(tableConfig, originalHeaders, rowValues)

		const rowPlaceholders = headers.map((_, index) => `$${values.length + index + 1}`)
		placeholders.push(`(${rowPlaceholders.join(', ')})`)
		values.push(...rowValues)
	})
	return { values, placeholders, skippedRowsNum, headers }
}

function processExcludedHeaders(tableConfig, originalHeaders) {
	if (!tableConfig.excludeColumns) {
		return originalHeaders
	}
	return originalHeaders.filter((header) => !tableConfig.excludeColumns.includes(header))
}

function processExcludedRowValues(tableConfig, originalHeaders, rowValues) {
	if (!tableConfig.excludeColumns) {
		return rowValues
	}
	const excludeIndexes = []
	originalHeaders.forEach((header, index) => {
		if (tableConfig.excludeColumns.includes(header)) {
			excludeIndexes.push(index)
		}
	})
	return rowValues.filter((_, index) => !excludeIndexes.includes(index))
}

function validateRowFIeldsNum(expectedHeaders, rowValues, lineIndex) {
	if (rowValues.length !== expectedHeaders.length) {
		console.warn(`⚠️  Строка ${lineIndex + 2} имеет неправильное количество полей (${rowValues.length} вместо ${expectedHeaders.length}), пропускаем...`)
		return false
	}
	return true
}

function logInsertResult(resultRowsNum, tableName, dataLinesLength, skippedRowsNum, actualCountBeforeSequence, actualCountAfterSequence, actualCountAfterCommit) {
	// Рассчитываем ожидаемое количество с учетом пропущенных строк
	const expectedCount = dataLinesLength - skippedRowsNum

	// Проверяем, что все строки были вставлены
	if (resultRowsNum !== expectedCount) {
		console.warn(`⚠️  ${tableName}: ожидалось вставить ${expectedCount} записей, но result.rowCount = ${resultRowsNum}`)
	}

	// КРИТИЧЕСКАЯ ПРОВЕРКА 1: сравниваем result.rowCount с реальным количеством в БД сразу после INSERT
	if (resultRowsNum !== actualCountBeforeSequence) {
		console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${tableName}: result.rowCount = ${resultRowsNum}, но в БД сразу после INSERT реально ${actualCountBeforeSequence} записей!`)
		console.error('   Это означает, что INSERT не выполнился или данные не были закоммичены!')
	}

	// КРИТИЧЕСКАЯ ПРОВЕРКА 2: проверяем, не исчезли ли данные после updateSequence
	if (actualCountBeforeSequence !== actualCountAfterSequence) {
		console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${tableName}: данные исчезли после updateSequence!`)
		console.error(`   Было ${actualCountBeforeSequence} записей, стало ${actualCountAfterSequence} записей`)
		console.error('   Возможно, updateSequence вызвал откат транзакции!')
	}

	// КРИТИЧЕСКАЯ ПРОВЕРКА 3: проверяем, что данные остались после COMMIT
	if (actualCountAfterSequence !== actualCountAfterCommit) {
		console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: ${tableName}: данные исчезли после COMMIT!`)
		console.error(`   Было ${actualCountAfterSequence} записей до COMMIT, стало ${actualCountAfterCommit} после COMMIT`)
		console.error('   Это означает проблему с коммитом транзакции!')
	}

	if (actualCountBeforeSequence === actualCountAfterSequence && actualCountAfterSequence === actualCountAfterCommit && resultRowsNum === actualCountBeforeSequence) {
		console.log(`✅ ${tableName}: импортировано ${resultRowsNum} записей`)
	} else {
		console.log(`⚠️  ${tableName}: result.rowCount=${resultRowsNum}, до sequence=${actualCountBeforeSequence}, после sequence=${actualCountAfterSequence}, после COMMIT=${actualCountAfterCommit}`)
	}
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
