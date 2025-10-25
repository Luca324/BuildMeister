export function parseCSVLine(line) {
	const values = []
	let current = ''
	let inQuotes = false
	let quoteCount = 0

	for (let i = 0; i < line.length; i++) {
		const char = line[i]

		if (char === '"') {
			quoteCount++
			if (inQuotes && line[i + 1] === '"') {
				// Экранированная кавычка внутри JSON
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
		
		// Для JSON полей (которые содержат сложные структуры) 
		// не удаляем кавычки, так как они могут быть частью JSON
		if (cleaned.startsWith('"') && cleaned.endsWith('"') && !cleaned.includes('{')) {
			// Обычные строковые поля - убираем окружающие кавычки
			cleaned = cleaned.slice(1, -1)
		}
		
		// Заменяем двойные кавычки на одинарные только для обычных строк
		if (!cleaned.includes('{') && !cleaned.includes('[')) {
			cleaned = cleaned.replace(/""/g, '"')
		}
		
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
