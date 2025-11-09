#!/usr/bin/env node

import importTables from './constants/importTables.js'
import { getConnection, testConnection } from './db-connection.js'
import { getTableStats } from './utils/importUtils.js'
import { quoteIdentifier, truncateTable } from './utils/sequenceUtils.js'

console.log('🚮 Начинаем очистку данных EverShop БД...')

async function clearSingleTable(tableConfig, countBefore) {
	let client

	try {
		client = await getConnection()
		await client.query('BEGIN')

		try {
            await truncateTable(tableConfig.name, client, { forceCascade: true })
			await client.query('COMMIT')
		} catch (error) {
			try {
				await client.query('ROLLBACK')
			} catch (rollbackError) {
				console.error(`⚠️  Не удалось откатить транзакцию для ${tableConfig.name}:`, rollbackError.message)
			}
			console.error(`❌ Ошибка при очистке таблицы ${tableConfig.name}:`, error.message)
			throw error
		}

		const quotedTable = quoteIdentifier(tableConfig.name)
		const verifyResult = await client.query(`SELECT COUNT(*) as count FROM ${quotedTable}`)
		const remaining = parseInt(verifyResult.rows[0].count)
		const removed = countBefore != null ? Math.max(countBefore - remaining, 0) : null

		if (remaining === 0) {
			console.log(`✅ Таблица ${tableConfig.name} очищена${removed != null ? `, удалено ${removed} записей` : ''}`)
		} else {
			console.warn(`⚠️  Таблица ${tableConfig.name} после очистки содержит ${remaining} записей`)
		}

		return { remaining, removed: removed ?? 0 }
	} finally {
		if (client) {
			client.release()
		}
	}
}

function printStats(stats, title) {
	console.log(`\n${title}`)
	Object.entries(stats).forEach(([table, count]) => {
		console.log(`   ${table}: ${count} записей`)
	})
}

function printDiff(statsBefore, statsAfter) {
	console.log('\n📉 Изменения после очистки:')
	Object.entries(statsBefore).forEach(([table, before]) => {
		const after = statsAfter[table] ?? 0
		const diff = after - before
		const diffLabel = diff > 0 ? `+${diff}` : `${diff}`
		console.log(`   ${table}: ${before} → ${after} (${diffLabel})`)
	})
}

async function main() {
	try {
		console.log('🔌 Тестируем подключение к базе данных...')
		const isConnected = await testConnection()
		if (!isConnected) {
			process.exit(1)
		}

		const statsBefore = await getTableStats(importTables)
		printStats(statsBefore, '📈 Статистика до очистки:')

		console.log('\n🧹 Очищаем таблицы в порядке, определенном importTables...')
		let totalRemoved = 0
		let clearedTables = 0

		for (const tableConfig of importTables) {
			const countBefore = statsBefore[tableConfig.name]
			const { removed } = await clearSingleTable(tableConfig, countBefore)
			totalRemoved += removed
			clearedTables += 1
		}

		const statsAfter = await getTableStats(importTables)
		printStats(statsAfter, '📈 Статистика после очистки:')
		printDiff(statsBefore, statsAfter)

		if (totalRemoved === 0) {
			console.log('\nℹ️  Таблицы уже были пустыми или очистка не изменила количество записей.')
		} else {
			console.log(`\n📉 Всего удалено записей: ${totalRemoved}`)
		}
		console.log(`🗑️  Таблиц обработано: ${clearedTables}`)
		console.log('\n🎉 Очистка данных завершена успешно!')
	} catch (error) {
		console.error('❌ Ошибка во время очистки данных:', error.message)
		process.exit(1)
	}
}

process.on('SIGINT', () => {
	console.log('\n⏹️  Получен сигнал прерывания, завершаем работу...')
	process.exit(0)
})

main()



