import exportTables from '../constants/exportTables.js'

import { getConnection } from '../db-connection.js'

export function logError(error) {
	console.error('❌ Ошибка подключения к БД:')
	console.error(`   ошибка: ${JSON.stringify(error)}`)
	console.error(`   Сообщение: ${error.message}`)
	console.error(`   Код ошибки: ${error.code || 'N/A'}`)
	console.error(`   Детали: ${error.detail || 'N/A'}`)
	console.error(`   Hint: ${error.hint || 'N/A'}`)
}
export function logconnectionSetting(connectionSetting) {
	console.log('📋 Текущие настройки подключения:')
	console.log(`   Host: ${connectionSetting.host}`)
	console.log(`   Port: ${connectionSetting.port}`)
	console.log(`   Database: ${connectionSetting.database}`)
	console.log(`   User: ${connectionSetting.user}`)
	console.log(`   SSL: ${connectionSetting.ssl ? 'enabled' : 'disabled'}`)
}

export function logExportSuccess(totalExported, exportDir) {

	console.log('\n🎉 Экспорт завершен успешно!')
	console.log(`📊 Всего экспортировано записей: ${totalExported}`)
	console.log(`📁 Данные сохранены в: ${exportDir}`)
	console.log('📄 Метаинформация: export-info.json')
}



export async function logDBStats() {

	// Получаем статистику до экспорта
	console.log('\n📈 Статистика данных в БД:')
	const stats = await getTableStats()
	Object.entries(stats).forEach(([table, count]) => {
		console.log(`   ${table}: ${count} записей`)
	})
}

async function getTableStats() {
	const stats = {}

	for (const table of exportTables) {
		let client
		try {
			client = await getConnection()
			const result = await client.query(`SELECT COUNT(*) as count FROM ${table.name.split('_')[0]}`)
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
