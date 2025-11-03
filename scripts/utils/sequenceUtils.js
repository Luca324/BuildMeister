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
      SELECT setval('${sequenceName}', COALESCE((SELECT MAX(${primaryKeyColumn}) FROM ${tableName}), 1), true)
    `
		await client.query(query)
		console.log(`🔄 Обновлена последовательность: ${sequenceName}`)
	} catch (error) {
		console.warn(`⚠️  Не удалось обновить последовательность ${sequenceName}:`, error.message)
	}
}

export async function truncateTable(tableName, client) {
	// Таблицы, которые необходимо всегда очищать с CASCADE из-за рекурсивных связей
	const alwaysCascadeTables = ['category', 'product', 'attribute', 'attribute_group', 'collection', 'tax_class']
	
	try {
		if (alwaysCascadeTables.includes(tableName)) {
			// Для этих таблиц всегда используем CASCADE
			await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`)
			console.log(`🗑️  Очищена таблица: ${tableName} (CASCADE)`)
		} else {
			// Сначала пытаемся очистить без CASCADE
			await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY`)
			console.log(`🗑️  Очищена таблица: ${tableName}`)
		}
	} catch (error) {
		if (error.message.includes('external') || error.message.includes('foreign key')) {
			// Если есть внешние ключи, очищаем с CASCADE
			try {
				await client.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`)
				console.log(`🗑️  Очищена таблица: ${tableName} (CASCADE)`)
			} catch (cascadeError) {
				console.warn(`⚠️  Не удалось очистить таблицу ${tableName}:`, cascadeError.message)
			}
		} else {
			console.warn(`⚠️  Не удалось очистить таблицу ${tableName}:`, error.message)
		}
	}
}

// Функция для очистки связанных таблиц перед очисткой родительской
export async function truncateRelatedTables(tableName, client) {
	// Эта функция НЕ должна вызывать truncateTable для связанных таблиц,
	// так как они будут очищены CASCADE при очистке родительской таблицы
	// Оставляем пустой для совместимости
}
