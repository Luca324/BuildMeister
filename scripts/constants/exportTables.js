export // Список таблиц для экспорта с их SQL запросами
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
];
