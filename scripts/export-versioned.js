#!/usr/bin/env node
import { execa } from 'execa'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Форматируем дату и время для имени папки: YYYYMMDD-HHMMSS
function getVersionedFolderName() {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const hours = String(now.getHours()).padStart(2, '0')
	const minutes = String(now.getMinutes()).padStart(2, '0')
	const seconds = String(now.getSeconds()).padStart(2, '0')
	
	return `data-export-${year}${month}${day}-${hours}${minutes}${seconds}`
}

async function main() {
	try {
		console.log('🔄 Начинаем версионированный экспорт...*')
		
		// Получаем абсолютный путь к корню проекта
		const projectRoot = path.join(__dirname, '..')
		const versionedFolderName = getVersionedFolderName()
		const exportDir = path.join(projectRoot, versionedFolderName)
		
		console.log(`📁 Создаем папку бэкапа: ${versionedFolderName}*`)
		
		// Создаем папку для экспорта
		if (!fs.existsSync(exportDir)) {
			fs.mkdirSync(exportDir, { recursive: true })
			console.log(`✅ Папка создана: ${exportDir}*`)
		}
		
		// Устанавливаем переменную окружения и запускаем экспорт
		console.log(`🚀 Запускаем экспорт данных в ${versionedFolderName}...*`)
		
		const exportScriptPath = path.join(__dirname, 'export-data.js')
		const result = await execa('node', [exportScriptPath], {
			env: {
				...process.env,
				EXPORT_DIR: exportDir
			},
			cwd: projectRoot,
			stdio: 'inherit'
		})
		
		console.log(`✅ Версионированный экспорт завершен успешно!*`)
		console.log(`📦 Бэкап сохранен в: ${versionedFolderName}*`)
		
		process.exit(0)
	} catch (error) {
		console.error('❌ Ошибка при версионированном экспорте:', error.message)
		process.exit(1)
	}
}

main()

