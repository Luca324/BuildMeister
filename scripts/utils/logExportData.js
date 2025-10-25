export function logExportData(totalExported, exportDir) {
	// Создаем файл с метаинформацией
	const metaInfo = {
		exportDate: new Date().toISOString(),
		database: connectionSetting.database,
		host: connectionSetting.host,
		port: connectionSetting.port,
		tables: stats,
		totalRecords: totalExported,
	};

	const metaPath = path.join(exportDir, 'export-info.json');
	fs.writeFileSync(metaPath, JSON.stringify(metaInfo, null, 2), 'utf8');
	logExportSuccess(totalExported, exportDir);
}
