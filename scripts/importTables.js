// Список таблиц для импорта в правильном порядке (с учетом зависимостей)
export const importTables = [
  {
    name: 'setting',
    filename: 'settings.csv',
    hasSequence: true,
    sequenceName: 'setting_setting_id_seq',
    truncate: true,
    excludeColumns: ['setting_id']
  },
  {
    name: 'category',
    filename: 'categories.csv',
    hasSequence: true,
    sequenceName: 'category_category_id_seq',
    truncate: true,
    excludeColumns: ['category_id']
  },
  {
    name: 'category_description',
    filename: 'category_descriptions.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['category_description_id']
  },
  {
    name: 'attribute',
    filename: 'attributes.csv',
    hasSequence: true,
    sequenceName: 'attribute_attribute_id_seq',
    truncate: true,
    excludeColumns: ['attribute_id']
  },
  {
    name: 'attribute_option',
    filename: 'attribute_options.csv',
    hasSequence: true,
    sequenceName: 'attribute_option_attribute_option_id_seq',
    truncate: true,
    excludeColumns: ['attribute_option_id']
  },
  {
    name: 'attribute_group',
    filename: 'attribute_groups.csv',
    hasSequence: true,
    sequenceName: 'attribute_group_attribute_group_id_seq',
    truncate: true,
    excludeColumns: ['attribute_group_id']
  },
  {
    name: 'attribute_group_link',
    filename: 'attribute_group_links.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['attribute_group_link_id']
  },
  {
    name: 'variant_group',
    filename: 'variant_groups.csv',
    hasSequence: true,
    sequenceName: 'variant_group_variant_group_id_seq',
    truncate: true,
    excludeColumns: ['variant_group_id']
  },
  {
    name: 'collection',
    filename: 'collections.csv',
    hasSequence: true,
    sequenceName: 'collection_collection_id_seq',
    truncate: true,
    excludeColumns: ['collection_id']
  },
  {
    name: 'product',
    filename: 'products.csv',
    hasSequence: true,
    sequenceName: 'product_product_id_seq',
    truncate: true,
    excludeColumns: ['product_id']
  },
  {
    name: 'product_description',
    filename: 'product_descriptions.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['product_description_id']
  },
  {
    name: 'product_image',
    filename: 'product_images.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['product_image_id']
  },
  {
    name: 'product_inventory',
    filename: 'product_inventory.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['product_inventory_id']
  },
  {
    name: 'product_collection',
    filename: 'product_collections.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['product_collection_id']
  },
  {
    name: 'product_attribute_value_index',
    filename: 'product_attribute_values.csv',
    hasSequence: false,
    truncate: true,
    excludeColumns: ['product_attribute_value_index_id']
  },
  {
    name: 'product_custom_option',
    filename: 'product_custom_options.csv',
    hasSequence: true,
    sequenceName: 'product_custom_option_product_custom_option_id_seq',
    truncate: true,
    excludeColumns: ['product_custom_option_id']
  },
  {
    name: 'product_custom_option_value',
    filename: 'product_custom_option_values.csv',
    hasSequence: true,
    sequenceName: 'product_custom_option_value_product_custom_option_value_id_seq',
    truncate: true,
    excludeColumns: ['product_custom_option_value_id']
  }
];