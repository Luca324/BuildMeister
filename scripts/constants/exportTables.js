// Список таблиц для экспорта с их SQL запросами
const exportTables = [
	{
		name: 'admin_user',
		query: 'SELECT * FROM admin_user',
		filename: 'admin_user.csv',
	},{
		name: 'settings',
		query: 'SELECT * FROM setting',
		filename: 'settings.csv',
	},
	{
		name: 'categories',
		query: 'SELECT * FROM category',
		filename: 'categories.csv',
	},
	{
		name: 'category_descriptions',
		query: 'SELECT * FROM category_description',
		filename: 'category_descriptions.csv',
	},
	{
		name: 'attributes',
		query: 'SELECT * FROM attribute',
		filename: 'attributes.csv',
	},
	{
		name: 'attribute_options',
		query: 'SELECT * FROM attribute_option',
		filename: 'attribute_options.csv',
	},
	{
		name: 'attribute_groups',
		query: 'SELECT * FROM attribute_group',
		filename: 'attribute_groups.csv',
	},
	{
		name: 'attribute_group_links',
		query: 'SELECT * FROM attribute_group_link',
		filename: 'attribute_group_links.csv',
	},
	{
		name: 'variant_groups',
		query: 'SELECT * FROM variant_group',
		filename: 'variant_groups.csv',
	},
	{
		name: 'collections',
		query: 'SELECT * FROM collection',
		filename: 'collections.csv',
	},
	{
		name: 'products',
		query: 'SELECT * FROM product',
		filename: 'products.csv',
	},
	{
		name: 'product_descriptions',
		query: 'SELECT * FROM product_description',
		filename: 'product_descriptions.csv',
	},
	{
		name: 'product_images',
		query: 'SELECT * FROM product_image',
		filename: 'product_images.csv',
	},
	{
		name: 'product_inventory',
		query: 'SELECT * FROM product_inventory',
		filename: 'product_inventory.csv',
	},
	{
		name: 'product_collections',
		query: 'SELECT * FROM product_collection',
		filename: 'product_collections.csv',
	},
	{
		name: 'product_attribute_values',
		query: 'SELECT * FROM product_attribute_value_index',
		filename: 'product_attribute_values.csv',
	},
	{
		name: 'product_custom_options',
		query: 'SELECT * FROM product_custom_option',
		filename: 'product_custom_options.csv',
	},
	{
		name: 'product_custom_option_values',
		query: 'SELECT * FROM product_custom_option_value',
		filename: 'product_custom_option_values.csv',
	},
	{
		name: 'cart',
		query: 'SELECT * FROM cart',
		filename: 'cart.csv',
	},
	{
		name: 'cart_address',
		query: 'SELECT * FROM cart_address',
		filename: 'cart_address.csv',
	},
	{
		name: 'cart_item',
		query: 'SELECT * FROM cart_item',
		filename: 'cart_item.csv',
	},
	{
		name: 'cms_page',
		query: 'SELECT * FROM cms_page',
		filename: 'cms_page.csv',
	},
	{
		name: 'cms_page_description',
		query: 'SELECT * FROM cms_page_description',
		filename: 'cms_page_description.csv',
	},
	{
		name: 'coupon',
		query: 'SELECT * FROM coupon',
		filename: 'coupon.csv',
	},
	{
		name: 'customer',
		query: 'SELECT * FROM customer',
		filename: 'customer.csv',
	},
	{
		name: 'customer_address',
		query: 'SELECT * FROM customer_address',
		filename: 'customer_address.csv',
	},
	{
		name: 'customer_group',
		query: 'SELECT * FROM customer_group',
		filename: 'customer_group.csv',
	},
	{
		name: 'event',
		query: 'SELECT * FROM event',
		filename: 'event.csv',
	},
	{
		name: 'migration',
		query: 'SELECT * FROM migration',
		filename: 'migration.csv',
	},
	{
		name: 'order',
		query: 'SELECT * FROM order',
		filename: 'order.csv',
	},
	{
		name: 'order_activity',
		query: 'SELECT * FROM order_activity',
		filename: 'order_activity.csv',
	},
	{
		name: 'order_address',
		query: 'SELECT * FROM order_address',
		filename: 'order_address.csv',
	},
	{
		name: 'order_item',
		query: 'SELECT * FROM order_item',
		filename: 'order_item.csv',
	},
	{
		name: 'payment_transaction',
		query: 'SELECT * FROM payment_transaction',
		filename: 'payment_transaction.csv',
	},
	{
		name: 'reset_password_token',
		query: 'SELECT * FROM reset_password_token',
		filename: 'reset_password_token.csv',
	},
	{
		name: 'session',
		query: 'SELECT * FROM session',
		filename: 'session.csv',
	},
	{
		name: 'shipment',
		query: 'SELECT * FROM shipment',
		filename: 'shipment.csv',
	},
	{
		name: 'shipping_method',
		query: 'SELECT * FROM shipping_method',
		filename: 'shipping_method.csv',
	},
	{
		name: 'shipping_zone',
		query: 'SELECT * FROM shipping_zone',
		filename: 'shipping_zone.csv',
	},
	{
		name: 'shipping_zone_method',
		query: 'SELECT * FROM shipping_zone_method',
		filename: 'shipping_zone_method.csv',
	},
	{
		name: 'shipping_zone_province',
		query: 'SELECT * FROM shipping_zone_province',
		filename: 'shipping_zone_province.csv',
	},
	{
		name: 'tax_class',
		query: 'SELECT * FROM tax_class',
		filename: 'tax_class.csv',
	},
	{
		name: 'tax_rate',
		query: 'SELECT * FROM tax_rate',
		filename: 'tax_rate.csv',
	},
	{
		name: 'url_rewrite',
		query: 'SELECT * FROM url_rewrite',
		filename: 'url_rewrite.csv',
	},
	{
		name: 'widget',
		query: 'SELECT * FROM widget',
		filename: 'widget.csv',
	},
]
console.log(exportTables.length)
export default exportTables
