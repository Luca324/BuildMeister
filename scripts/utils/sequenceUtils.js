export function quoteIdentifier(identifier) {
	return `"${identifier.replace(/"/g, '""')}"`
}

export function getPrimaryKeyColumn(tableName) {
	// Определяем имя первичного ключа на основе имени таблицы
	const keyMap = {
		'setting': 'setting_id',
		'attribute': 'attribute_id',
		'attribute_option': 'attribute_option_id',
		'attribute_group': 'attribute_group_id',
		'variant_group': 'variant_group_id',
		'category': 'category_id',
		'collection': 'collection_id',
		'product': 'product_id',
		'product_custom_option': 'product_custom_option_id',
		'product_custom_option_value': 'product_custom_option_value_id',
		'admin_user': 'admin_user_id',
		'cart': 'cart_id',
		'cms_page': 'cms_page_id',
		'coupon': 'coupon_id',
		'customer': 'customer_id',
		'customer_group': 'customer_group_id',
		'event': 'event_id',
		'order': 'order_id',
		'payment_transaction': 'payment_transaction_id',
		'shipment': 'shipment_id',
		'shipping_method': 'shipping_method_id',
		'shipping_zone': 'shipping_zone_id',
		'tax_class': 'tax_class_id',
		'tax_rate': 'tax_rate_id',
		'url_rewrite': 'url_rewrite_id',
		'widget': 'widget_id',
	}

	return keyMap[tableName] || `${tableName.split('_')[0]}_id`
}

export async function updateSequence(sequenceName, tableName, client) {
	try {
		const primaryKeyColumn = getPrimaryKeyColumn(tableName)
		const query = `
	      SELECT setval('${sequenceName}', COALESCE((SELECT MAX(${quoteIdentifier(primaryKeyColumn)}) FROM ${quoteIdentifier(tableName)}), 1), true)
	    `
		await client.query(query)
		console.log(`🔄 Обновлена последовательность: ${sequenceName}`)
	} catch (error) {
		console.warn(`⚠️  Не удалось обновить последовательность ${sequenceName}:`, error.message)
	}
}

export async function truncateTable(tableName, client, options = {}) {
	const { forceCascade = true } = options
	const quotedTable = quoteIdentifier(tableName)
	// Убираем CASCADE - все таблицы очищаются по порядку из списка importTables
	// Каждая таблица очищается только один раз, поэтому CASCADE не нужен
	try {
		// Пытаемся очистить без CASCADE
		const truncateQuery = forceCascade
			? `TRUNCATE TABLE ${quotedTable} RESTART IDENTITY CASCADE`
			: `TRUNCATE TABLE ${quotedTable} RESTART IDENTITY`
		await client.query(truncateQuery)
		console.log(`🗑️  Очищена таблица: ${tableName}`)
	} catch (error) {
		// Если не удалось из-за foreign key constraints, используем DELETE
		// DELETE не требует очистки дочерних таблиц
		if (error.message.includes('external') || error.message.includes('foreign key')) {
			if (!forceCascade) {
				// Повторяем попытку с CASCADE, если разрешено по опциям
				try {
					await client.query(`TRUNCATE TABLE ${quotedTable} RESTART IDENTITY CASCADE`)
					console.log(`🗑️  Очищена таблица: ${tableName} (через TRUNCATE CASCADE)`)
					return
				} catch (cascadeError) {
					// Если и CASCADE не удался, продолжаем с DELETE
					error = cascadeError
				}
			}
			try {
				const deleteResult = await client.query(`DELETE FROM ${quotedTable}`)
				// Сбрасываем sequence вручную
				const primaryKeyColumn = getPrimaryKeyColumn(tableName)
				const sequenceName = `${tableName}_${primaryKeyColumn}_seq`
				try {
					await client.query(`SELECT setval('${sequenceName}', 1, false)`)
				} catch (seqError) {
					// Игнорируем ошибки sequence, если sequence не существует
				}
				console.log(`🗑️  Очищена таблица: ${tableName} (через DELETE, удалено ${deleteResult.rowCount} записей)`)
			} catch (deleteError) {
				// Если и DELETE не удался, пробрасываем ошибку
				console.warn(`⚠️  Не удалось очистить таблицу ${tableName} (TRUNCATE и DELETE):`, deleteError.message)
				throw deleteError
			}
		} else {
			// Другие ошибки пробрасываем
			console.warn(`⚠️  Не удалось очистить таблицу ${tableName}:`, error.message)
			throw error
		}
	}
}

// Функция для очистки связанных таблиц перед очисткой родительской
export async function truncateRelatedTables(tableName, client) {
	// Эта функция больше не используется, так как мы убрали CASCADE
	// Каждая таблица очищается отдельно по порядку из списка importTables
	// Оставляем пустой для совместимости
}
