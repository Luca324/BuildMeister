import fs from 'fs'
import path from 'path'

import { connectionSetting } from '../db-connection.js'


export default function logExportData(totalExported, exportDir, stats) {
	// Создаем файл с метаинформацией
	const metaInfo = {
		exportDate: new Date().toISOString(),
		database: connectionSetting.database,
		host: connectionSetting.host,
		port: connectionSetting.port,
		tables: stats,
		totalRecords: totalExported,
	}

	const metaPath = path.join(exportDir, 'export-info.json')
	fs.writeFileSync(metaPath, JSON.stringify(metaInfo, null, 2), 'utf8')
}
