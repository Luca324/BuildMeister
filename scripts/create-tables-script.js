export const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS setting (
      setting_id SERIAL PRIMARY KEY,
      value TEXT,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      is_json BOOLEAN NOT NULL DEFAULT false
    )`,
  
    `CREATE TABLE IF NOT EXISTS category (
      category_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      status BOOLEAN NOT NULL,
      parent_id INT,
      include_in_nav BOOLEAN NOT NULL,
      position SMALLINT,
      show_products BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  
    `CREATE TABLE IF NOT EXISTS category_description (
      category_description_id SERIAL PRIMARY KEY,
      category_description_category_id INT NOT NULL,
      name TEXT,
      short_description TEXT,
      description TEXT,
      image TEXT,
      meta_title TEXT,
      meta_keywords TEXT,
      meta_description TEXT,
      url_key TEXT
    )`,
  
    `CREATE TABLE IF NOT EXISTS attribute (
      attribute_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      attribute_code TEXT NOT NULL,
      attribute_name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_required BOOLEAN NOT NULL DEFAULT false,
      display_on_frontend BOOLEAN NOT NULL DEFAULT false,
      sort_order INT NOT NULL DEFAULT 0,
      is_filterable BOOLEAN NOT NULL DEFAULT false
    )`,
  
    `CREATE TABLE IF NOT EXISTS attribute_option (
      attribute_option_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      attribute_id INT NOT NULL,
      attribute_code TEXT,
      option_text TEXT
    )`,
  
    `CREATE TABLE IF NOT EXISTS attribute_group (
      attribute_group_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      group_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  
    `CREATE TABLE IF NOT EXISTS attribute_group_link (
      attribute_group_link_id SERIAL PRIMARY KEY,
      attribute_id INT NOT NULL,
      group_id INT NOT NULL
    )`,
  
    `CREATE TABLE IF NOT EXISTS variant_group (
      variant_group_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      attribute_one INT,
      attribute_two INT,
      attribute_three INT,
      attribute_four INT,
      attribute_five INT,
      attribute_group_id INT NOT NULL,
      visibility BOOLEAN NOT NULL DEFAULT false
    )`,
  
    `CREATE TABLE IF NOT EXISTS collection (
      collection_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      name TEXT,
      description TEXT,
      code TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`,
  
    `CREATE TABLE IF NOT EXISTS product (
      product_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      sku TEXT,
      name TEXT,
      description TEXT,
      short_description TEXT,
      price NUMERIC(12,4),
      weight NUMERIC(12,4),
      status BOOLEAN DEFAULT false,
      visibility BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      variant_group_id INT,
      group_id INT DEFAULT 1,
      tax_class SMALLINT
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_description (
      product_description_id SERIAL PRIMARY KEY,
      product_description_product_id INT NOT NULL,
      name TEXT,
      short_description TEXT,
      description TEXT,
      meta_title TEXT,
      meta_keywords TEXT,
      meta_description TEXT,
      url_key TEXT
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_image (
      product_image_id SERIAL PRIMARY KEY,
      product_image_product_id INT NOT NULL,
      image TEXT,
      thumb_image TEXT,
      single_image TEXT,
      listing_image TEXT,
      is_main BOOLEAN DEFAULT false
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_inventory (
      product_inventory_id SERIAL PRIMARY KEY,
      product_inventory_product_id INT NOT NULL,
      qty INT NOT NULL DEFAULT 0,
      stock_availability BOOLEAN NOT NULL DEFAULT false,
      manage_stock BOOLEAN NOT NULL DEFAULT false
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_collection (
      product_collection_id SERIAL PRIMARY KEY,
      product_id INT NOT NULL,
      collection_id INT NOT NULL
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_attribute_value_index (
      product_attribute_value_index_id SERIAL PRIMARY KEY,
      product_id INT NOT NULL,
      attribute_id INT NOT NULL,
      option_id INT,
      option_text TEXT
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_custom_option (
      product_custom_option_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      product_custom_option_product_id INT NOT NULL,
      option_name TEXT,
      option_type TEXT,
      is_required BOOLEAN DEFAULT false,
      sort_order INT
    )`,
  
    `CREATE TABLE IF NOT EXISTS product_custom_option_value (
      product_custom_option_value_id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      option_id INT NOT NULL,
      option_text TEXT,
      extra_price NUMERIC(12,4) DEFAULT NULL::numeric,
      sort_order INT
    )`
  ];