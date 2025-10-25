export function parseCSVLine(line) {
	const values = []
	let current = ''
	let inQuotes = false

	for (let i = 0; i < line.length; i++) {
		const char = line[i]

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Экранированная кавычка
				current += '"'
				i++ // Пропускаем следующую кавычку
			} else {
				// Начало или конец строки в кавычках
				inQuotes = !inQuotes
			}
		} else if (char === ',' && !inQuotes) {
			values.push(current)
			current = ''
		} else {
			current += char
		}
	}

	values.push(current)

	// Очищаем значения от лишних кавычек и пробелов
	return values.map(val => {
		let cleaned = val.trim()
		// Убираем окружающие кавычки если есть
		if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
			cleaned = cleaned.slice(1, -1)
		}
		// Заменяем двойные кавычки на одинарные
		cleaned = cleaned.replace(/""/g, '"')
		// Обрабатываем пустые значения
		if (cleaned === '' || cleaned === 'NULL') {
			return null
		}
		return cleaned
	})
}

import fs from 'fs'

export function parseCSVFile(filePath) {
	const csvContent = fs.readFileSync(filePath, 'utf8')
	const lines = csvContent.trim().split('\n')

	if (lines.length <= 1) {
		return { headers: [], dataLines: [] }
	}

	// Получаем заголовки
	const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
	const dataLines = lines.slice(1)

	return { headers, dataLines }
}
