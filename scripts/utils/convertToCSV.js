
export function convertToCSV(rows, fields) {
	if (rows.length === 0) return '';

	// Заголовки
	const headers = fields.map(field => field.name).join(',');

	// Данные
	const dataRows = rows.map(row => {
		return fields.map(field => {
			const value = row[field.name];
			if (value === null || value === undefined) return '';

			let stringValue;

			// Обрабатываем даты специальным образом
			if (value instanceof Date) {
				stringValue = value.toISOString(); // Сохраняем в ISO формате
			} else if (typeof value === 'object' && value !== null) {
				// Для объектов (вдруг есть JSON данные)
				stringValue = JSON.stringify(value);
			} else {
				stringValue = String(value);
			}

			// Экранируем значения содержащие запятые, кавычки или переносы строк
			if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
				return `"${stringValue.replace(/"/g, '""')}"`;
			}

			return stringValue;
		}).join(',');
	});

	return [headers, ...dataRows].join('\n');
}
