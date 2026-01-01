# База знаний: Структура базы данных EverShop

> **ВАЖНО**: При генерации данных для миграций всегда обращайтесь к этому файлу для проверки структуры таблиц!

## Общая информация

- **СУБД**: PostgreSQL
- **Порт**: 5433
- **Исходные данные**: `data-export/` (CSV файлы)
- **Дата последнего экспорта**: 2025-10-25

---

## Структура таблиц

### 1. ADMIN_USER - Администраторы
```csv
admin_user_id, uuid, status, email, password, full_name, created_at, updated_at
```
**Описание**: Таблица учетных записей администраторов системы.
- `admin_user_id` (PK) - ID администратора
- `uuid` - Уникальный идентификатор
- `status` - Статус учетной записи
- `email` - Email для входа
- `password` - Хешированный пароль
- `full_name` - Полное имя
- `created_at`, `updated_at` - Временные метки

---

### 2. ATTRIBUTES - Атрибуты товаров
```csv
attribute_id, uuid, attribute_code, attribute_name, type, is_required, display_on_frontend, sort_order, is_filterable
```
**Описание**: Определения атрибутов товаров (цвет, размер и т.д.).
- `attribute_id` (PK) - ID атрибута
- `uuid` - Уникальный идентификатор
- `attribute_code` - Код атрибута (например, 'color')
- `attribute_name` - Название атрибута
- `type` - Тип атрибута (select, text, textarea, date и т.д.)
- `is_required` - Обязательный ли атрибут
- `display_on_frontend` - Отображать на фронтенде
- `sort_order` - Порядок сортировки
- `is_filterable` - Использовать для фильтрации

---

### 3. ATTRIBUTE_GROUPS - Группы атрибутов
```csv
attribute_group_id, uuid, group_name, created_at, updated_at
```
**Описание**: Группы атрибутов для организации.
- `attribute_group_id` (PK) - ID группы
- `uuid` - Уникальный идентификатор
- `group_name` - Название группы
- `created_at`, `updated_at` - Временные метки

---

### 4. ATTRIBUTE_GROUP_LINKS - Связи атрибутов и групп
```csv
attribute_group_link_id, attribute_id, group_id
```
**Описание**: Связь атрибутов с группами (many-to-many).
- `attribute_group_link_id` (PK) - ID связи
- `attribute_id` (FK) - ID атрибута → `attributes.attribute_id`
- `group_id` (FK) - ID группы → `attribute_groups.attribute_group_id`

---

### 5. ATTRIBUTE_OPTIONS - Опции атрибутов
```csv
attribute_option_id, uuid, attribute_id, attribute_code, option_text
```
**Описание**: Возможные значения для атрибутов типа select.
- `attribute_option_id` (PK) - ID опции
- `uuid` - Уникальный идентификатор
- `attribute_id` (FK) - ID атрибута → `attributes.attribute_id`
- `attribute_code` - Код атрибута (дублирование для оптимизации)
- `option_text` - Текст опции (например, "Красный", "Синий")

---

### 6. CART - Корзины покупателей
```csv
cart_id, uuid, sid, customer_id, customer_email, customer_full_name, user_ip, status, coupon, shipping_fee_excl_tax, shipping_fee_incl_tax, discount_amount, sub_total, sub_total_incl_tax, total_qty, total_weight, tax_amount, grand_total, shipping_method, shipping_method_name, shipping_zone_id, shipping_address_id, payment_method, payment_method_name, billing_address_id, shipping_note, created_at, updated_at
```
**Описание**: Корзины покупателей (активные и завершенные).
- `cart_id` (PK) - ID корзины
- `sid` - Session ID
- `customer_id` (FK, nullable) - ID покупателя → `customer.customer_id`
- Ценовые поля с налогами и без
- `status` - Статус корзины
- Методы доставки и оплаты

---

### 7. CART_ITEM - Товары в корзине
```csv
cart_item_id, uuid, cart_id, product_id, product_sku, product_name, thumbnail, product_weight, product_price, product_price_incl_tax, qty, final_price, final_price_incl_tax, tax_percent, tax_amount, discount_amount, total, variant_group_id, variant_options, product_custom_options, requested_data
```
**Описание**: Товары, добавленные в корзины.
- `cart_item_id` (PK) - ID элемента корзины
- `cart_id` (FK) - ID корзины → `cart.cart_id`
- `product_id` (FK) - ID товара → `products.product_id`
- `variant_group_id` (FK, nullable) - ID варианта → `variant_groups.variant_group_id`
- Ценовые расчеты с налогами
- `variant_options` - JSON с выбранными опциями
- `product_custom_options` - JSON с кастомными опциями

---

### 8. CART_ADDRESS - Адреса в корзинах
```csv
cart_address_id, uuid, full_name, postcode, telephone, country, province, city, address_1, address_2
```
**Описание**: Адреса доставки и оплаты в корзинах.
- `cart_address_id` (PK) - ID адреса
- Полная адресная информация

---

### 9. CATEGORIES - Категории товаров
```csv
category_id, uuid, status, parent_id, include_in_nav, position, show_products, created_at, updated_at
```
**Описание**: Категории товаров (древовидная структура).
- `category_id` (PK) - ID категории
- `parent_id` (FK, nullable) - ID родительской категории → `categories.category_id`
- `include_in_nav` - Включать в навигацию
- `position` - Позиция в списке
- `show_products` - Показывать товары на странице категории
- `status` - Статус (активна/неактивна)

---

### 10. CATEGORY_DESCRIPTIONS - Описания категорий
```csv
category_description_id, category_description_category_id, name, short_description, description, image, meta_title, meta_keywords, meta_description, url_key
```
**Описание**: Локализованные описания категорий.
- `category_description_id` (PK) - ID описания
- `category_description_category_id` (FK) - ID категории → `categories.category_id`
- `name` - Название категории
- `description` - Полное описание (HTML)
- `short_description` - Краткое описание
- `image` - Путь к изображению
- Meta-теги для SEO
- `url_key` - ЧПУ (slug)

---

### 11. CMS_PAGE - CMS страницы
```csv
cms_page_id, uuid, layout, status, created_at, updated_at
```
**Описание**: CMS страницы (О нас, Контакты и т.д.).
- `cms_page_id` (PK) - ID страницы
- `layout` - Шаблон страницы
- `status` - Статус публикации

---

### 12. CMS_PAGE_DESCRIPTION - Описания CMS страниц
```csv
cms_page_description_id, cms_page_description_cms_page_id, url_key, name, content, meta_title, meta_keywords, meta_description
```
**Описание**: Локализованный контент CMS страниц.
- `cms_page_description_id` (PK) - ID описания
- `cms_page_description_cms_page_id` (FK) - ID страницы → `cms_page.cms_page_id`
- `content` - HTML контент страницы
- `url_key` - ЧПУ
- Meta-теги для SEO

---

### 13. COLLECTIONS - Коллекции товаров
```csv
collection_id, uuid, name, description, code, created_at, updated_at
```
**Описание**: Коллекции для группировки товаров (распродажа, новинки и т.д.).
- `collection_id` (PK) - ID коллекции
- `code` - Уникальный код коллекции
- `name` - Название коллекции
- `description` - Описание коллекции

---

### 14. COUPON - Купоны на скидку
```csv
coupon_id, uuid, status, description, discount_amount, free_shipping, discount_type, coupon, used_time, target_products, condition, user_condition, buyx_gety, max_uses_time_per_coupon, max_uses_time_per_customer, start_date, end_date, created_at, updated_at
```
**Описание**: Промо-купоны и скидки.
- `coupon_id` (PK) - ID купона
- `coupon` - Код купона
- `discount_type` - Тип скидки (процент, фиксированная сумма)
- `discount_amount` - Размер скидки
- `condition` - JSON с условиями применения
- `target_products` - JSON с целевыми товарами
- Временные ограничения (start_date, end_date)
- Лимиты использования

---

### 15. CUSTOMER - Покупатели
```csv
customer_id, uuid, status, group_id, email, password, full_name, created_at, updated_at
```
**Описание**: Учетные записи покупателей.
- `customer_id` (PK) - ID покупателя
- `group_id` (FK) - ID группы → `customer_group.customer_group_id`
- `email` - Email для входа
- `password` - Хешированный пароль
- `status` - Статус учетной записи

---

### 16. CUSTOMER_ADDRESS - Адреса покупателей
```csv
customer_address_id, uuid, customer_id, full_name, telephone, address_1, address_2, postcode, city, province, country, created_at, updated_at, is_default
```
**Описание**: Сохраненные адреса покупателей.
- `customer_address_id` (PK) - ID адреса
- `customer_id` (FK) - ID покупателя → `customer.customer_id`
- `is_default` - Адрес по умолчанию
- Полная адресная информация

---

### 17. CUSTOMER_GROUP - Группы покупателей
```csv
customer_group_id, uuid, group_name, created_at, updated_at
```
**Описание**: Группы покупателей (VIP, оптовики и т.д.).
- `customer_group_id` (PK) - ID группы
- `group_name` - Название группы

---

### 18. EVENT - События системы
```csv
event_id, name, data, created_at
```
**Описание**: Лог системных событий.
- `event_id` (PK) - ID события
- `name` - Название события
- `data` - JSON с данными события

---

### 19. MIGRATION - Миграции БД
```csv
migration_id, module, version, created_at, updated_at
```
**Описание**: История применения миграций.
- `migration_id` (PK) - ID миграции
- `module` - Модуль EverShop
- `version` - Версия миграции

---

### 20. ORDER - Заказы
```csv
order_id, uuid, integration_order_id, sid, order_number, cart_id, currency, customer_id, customer_email, customer_full_name, user_ip, user_agent, coupon, shipping_fee_excl_tax, shipping_fee_incl_tax, discount_amount, sub_total, sub_total_incl_tax, total_qty, total_weight, tax_amount, shipping_note, grand_total, shipping_method, shipping_method_name, shipping_address_id, payment_method, payment_method_name, billing_address_id, shipment_status, payment_status, created_at, updated_at
```
**Описание**: Оформленные заказы.
- `order_id` (PK) - ID заказа
- `order_number` - Человекочитаемый номер заказа
- `cart_id` (FK) - ID корзины → `cart.cart_id`
- `customer_id` (FK, nullable) - ID покупателя → `customer.customer_id`
- Статусы доставки и оплаты
- Финансовая информация

---

### 21. ORDER_ITEM - Товары в заказах
```csv
order_item_id, uuid, order_item_order_id, product_id, referer, product_sku, product_name, thumbnail, product_weight, product_price, product_price_incl_tax, qty, final_price, final_price_incl_tax, tax_percent, tax_amount, discount_amount, sub_total, total, variant_group_id, variant_options, product_custom_options, requested_data
```
**Описание**: Товары в заказах (снимок на момент заказа).
- `order_item_id` (PK) - ID элемента заказа
- `order_item_order_id` (FK) - ID заказа → `order.order_id`
- `product_id` (FK) - ID товара → `products.product_id`
- Расчеты цен с налогами

---

### 22. ORDER_ADDRESS - Адреса в заказах
```csv
order_address_id, uuid, full_name, postcode, telephone, country, province, city, address_1, address_2
```
**Описание**: Адреса доставки и оплаты в заказах.
- `order_address_id` (PK) - ID адреса
- Полная адресная информация

---

### 23. ORDER_ACTIVITY - История заказа
```csv
order_activity_id, uuid, order_activity_order_id, comment, customer_notified, created_at, updated_at
```
**Описание**: Лог действий по заказу (изменение статуса, комментарии).
- `order_activity_id` (PK) - ID записи
- `order_activity_order_id` (FK) - ID заказа → `order.order_id`
- `comment` - Комментарий к действию
- `customer_notified` - Уведомлен ли покупатель

---

### 24. PAYMENT_TRANSACTION - Платежные транзакции
```csv
payment_transaction_id, uuid, payment_transaction_order_id, transaction_id, transaction_type, amount, parent_transaction_id, payment_action, additional_information, created_at
```
**Описание**: Транзакции оплаты заказов.
- `payment_transaction_id` (PK) - ID транзакции
- `payment_transaction_order_id` (FK) - ID заказа → `order.order_id`
- `transaction_id` - ID транзакции в платежной системе
- `transaction_type` - Тип (authorize, capture, refund)
- `amount` - Сумма
- `additional_information` - JSON с доп. информацией

---

### 25. PRODUCTS - Товары
```csv
product_id, uuid, type, variant_group_id, visibility, group_id, image, sku, price, weight, tax_class, status, created_at, updated_at, qty, manage_stock, stock_availability, tier_price
```
**Описание**: Основная таблица товаров.
- `product_id` (PK) - ID товара
- `type` - Тип товара (simple, variant)
- `variant_group_id` (FK, nullable) - ID группы вариантов → `variant_groups.variant_group_id`
- `group_id` (FK, nullable) - ID группы атрибутов → `attribute_groups.attribute_group_id`
- `sku` - Артикул (уникальный)
- `price` - Цена
- `weight` - Вес
- `tax_class` (FK, nullable) - Налоговый класс → `tax_class.tax_class_id`
- `status` - Статус (активен/неактивен)
- `visibility` - Видимость в каталоге
- Управление запасами (qty, manage_stock, stock_availability)
- `tier_price` - JSON с оптовыми ценами

---

### 26. PRODUCT_DESCRIPTIONS - Описания товаров
```csv
product_description_id, product_description_product_id, name, description, short_description, url_key, meta_title, meta_description, meta_keywords
```
**Описание**: Локализованные описания товаров.
- `product_description_id` (PK) - ID описания
- `product_description_product_id` (FK) - ID товара → `products.product_id`
- `name` - Название товара
- `description` - Полное описание (HTML)
- `short_description` - Краткое описание
- `url_key` - ЧПУ (slug)
- Meta-теги для SEO

---

### 27. PRODUCT_ATTRIBUTE_VALUES - Значения атрибутов товаров
```csv
product_attribute_value_id, product_id, attribute_id, option_id, option_text
```
**Описание**: Значения атрибутов для товаров.
- `product_attribute_value_id` (PK) - ID значения
- `product_id` (FK) - ID товара → `products.product_id`
- `attribute_id` (FK) - ID атрибута → `attributes.attribute_id`
- `option_id` (FK, nullable) - ID опции → `attribute_options.attribute_option_id`
- `option_text` - Текстовое значение (для text/textarea атрибутов)

---

### 28. PRODUCT_IMAGES - Изображения товаров
```csv
product_image_id, product_image_product_id, path, main_image, created_at, updated_at
```
**Описание**: Изображения товаров.
- `product_image_id` (PK) - ID изображения
- `product_image_product_id` (FK) - ID товара → `products.product_id`
- `path` - Путь к файлу изображения
- `main_image` - Главное изображение (boolean)

---

### 29. PRODUCT_INVENTORY - Склад товаров
```csv
product_inventory_id, product_inventory_product_id, qty, manage_stock, stock_availability
```
**Описание**: Управление запасами товаров.
- `product_inventory_id` (PK) - ID записи
- `product_inventory_product_id` (FK) - ID товара → `products.product_id`
- `qty` - Количество на складе
- `manage_stock` - Управлять остатками
- `stock_availability` - Доступность (в наличии/нет)

---

### 30. PRODUCT_COLLECTIONS - Товары в коллекциях
```csv
product_collection_id, collection_id, product_id
```
**Описание**: Связь товаров с коллекциями (many-to-many).
- `product_collection_id` (PK) - ID связи
- `collection_id` (FK) - ID коллекции → `collections.collection_id`
- `product_id` (FK) - ID товара → `products.product_id`

---

### 31. PRODUCT_CUSTOM_OPTIONS - Пользовательские опции товаров
```csv
product_custom_option_id, uuid, product_custom_option_product_id, option_name, option_type, is_required, sort_order
```
**Описание**: Определения кастомных опций товаров (гравировка и т.д.).
- `product_custom_option_id` (PK) - ID опции
- `product_custom_option_product_id` (FK) - ID товара → `products.product_id`
- `option_name` - Название опции
- `option_type` - Тип (text, textarea, select, radio, checkbox)
- `is_required` - Обязательная опция
- `sort_order` - Порядок отображения

---

### 32. PRODUCT_CUSTOM_OPTION_VALUES - Значения пользовательских опций
```csv
product_custom_option_value_id, uuid, option_id, extra_price, sort_order, value
```
**Описание**: Возможные значения для кастомных опций типа select.
- `product_custom_option_value_id` (PK) - ID значения
- `option_id` (FK) - ID опции → `product_custom_options.product_custom_option_id`
- `value` - Текст значения
- `extra_price` - Дополнительная цена
- `sort_order` - Порядок отображения

---

### 33. VARIANT_GROUPS - Группы вариантов товаров
```csv
variant_group_id, uuid, attribute_group_id, attribute_one, attribute_two, attribute_three, attribute_four, attribute_five, visibility, created_at, updated_at
```
**Описание**: Группы вариантов для товаров с вариациями (размер, цвет и т.д.).
- `variant_group_id` (PK) - ID группы вариантов
- `attribute_group_id` (FK) - ID группы атрибутов → `attribute_groups.attribute_group_id`
- `attribute_one` до `attribute_five` (FK) - ID атрибутов для вариаций → `attributes.attribute_id`
- `visibility` - Видимость вариантов

---

### 34. SHIPPING_ZONE - Зоны доставки
```csv
shipping_zone_id, uuid, name, country, created_at, updated_at
```
**Описание**: Географические зоны доставки.
- `shipping_zone_id` (PK) - ID зоны
- `name` - Название зоны
- `country` - Код страны

---

### 35. SHIPPING_ZONE_PROVINCE - Регионы в зонах доставки
```csv
zone_province_id, uuid, zone_id, province, created_at, updated_at
```
**Описание**: Регионы/области в зонах доставки.
- `zone_province_id` (PK) - ID записи
- `zone_id` (FK) - ID зоны → `shipping_zone.shipping_zone_id`
- `province` - Код региона

---

### 36. SHIPPING_METHOD - Методы доставки
```csv
shipping_method_id, uuid, name, is_enabled, created_at, updated_at
```
**Описание**: Доступные методы доставки.
- `shipping_method_id` (PK) - ID метода
- `name` - Название метода
- `is_enabled` - Активен ли метод

---

### 37. SHIPPING_ZONE_METHOD - Методы доставки для зон
```csv
shipping_zone_method_id, method_id, zone_id, is_enabled, cost, calculate_api, condition_type, max, min, price_based_cost, weight_based_cost
```
**Описание**: Настройка методов доставки для конкретных зон.
- `shipping_zone_method_id` (PK) - ID настройки
- `method_id` (FK) - ID метода → `shipping_method.shipping_method_id`
- `zone_id` (FK) - ID зоны → `shipping_zone.shipping_zone_id`
- `cost` - Стоимость доставки
- Условия расчета (weight_based_cost, price_based_cost)

---

### 38. TAX_CLASS - Налоговые классы
```csv
tax_class_id, uuid, name
```
**Описание**: Налоговые классы для товаров.
- `tax_class_id` (PK) - ID класса
- `name` - Название класса (например, "Облагаемые товары")

---

### 39. TAX_RATE - Налоговые ставки
```csv
tax_rate_id, uuid, name, tax_class_id, country, province, postcode, rate, is_compound, priority
```
**Описание**: Налоговые ставки для разных регионов.
- `tax_rate_id` (PK) - ID ставки
- `tax_class_id` (FK) - ID налогового класса → `tax_class.tax_class_id`
- `country` - Код страны
- `province` - Код региона
- `postcode` - Почтовый индекс (паттерн)
- `rate` - Ставка налога (decimal)
- `is_compound` - Составной налог
- `priority` - Приоритет применения

---

### 40. URL_REWRITE - ЧПУ (красивые URL)
```csv
url_rewrite_id, language, request_path, target_path, entity_uuid, entity_type
```
**Описание**: Перезаписи URL для SEO.
- `url_rewrite_id` (PK) - ID записи
- `language` - Код языка
- `request_path` - Запрашиваемый путь (красивый URL)
- `target_path` - Целевой путь (внутренний)
- `entity_uuid` - UUID сущности
- `entity_type` - Тип сущности (product, category, cms_page)

---

### 41. WIDGET - Виджеты интерфейса
```csv
widget_id, uuid, name, type, route, area, sort_order, settings, status, created_at, updated_at
```
**Описание**: Виджеты для отображения на страницах.
- `widget_id` (PK) - ID виджета
- `name` - Название виджета
- `type` - Тип виджета
- `route` - Маршрут (где отображать)
- `area` - Зона на странице
- `sort_order` - Порядок отображения
- `settings` - JSON с настройками
- `status` - Статус (активен/неактивен)

---

### 42. SESSION - Сессии пользователей
```csv
sid, sess, expire
```
**Описание**: Хранение сессий пользователей.
- `sid` (PK) - Session ID
- `sess` - JSON с данными сессии
- `expire` - Время истечения

---

### 43. RESET_PASSWORD_TOKEN - Токены сброса пароля
```csv
reset_password_token_id, uuid, customer_id, token, created_at, updated_at
```
**Описание**: Токены для восстановления пароля.
- `reset_password_token_id` (PK) - ID токена
- `customer_id` (FK) - ID покупателя → `customer.customer_id`
- `token` - Токен для сброса
- `created_at`, `updated_at` - Временные метки

---

### 44. SETTINGS - Настройки системы
```csv
setting_id, name, value, is_json
```
**Описание**: Конфигурация системы.
- `setting_id` (PK) - ID настройки
- `name` - Название настройки (ключ)
- `value` - Значение
- `is_json` - Является ли значение JSON

---

### 45. SHIPMENT - Отгрузки
```csv
shipment_id, uuid, shipment_order_id, carrier_name, tracking_number, created_at, updated_at
```
**Описание**: Информация об отгрузках заказов.
- `shipment_id` (PK) - ID отгрузки
- `shipment_order_id` (FK) - ID заказа → `order.order_id`
- `carrier_name` - Название перевозчика
- `tracking_number` - Трек-номер

---

## Важные связи между таблицами

### Товары (Products)
- `products` → `product_descriptions` (1:1)
- `products` → `product_images` (1:N)
- `products` → `product_inventory` (1:1)
- `products` → `product_attribute_values` (1:N)
- `products` → `product_collections` (N:M через промежуточную таблицу)
- `products` → `product_custom_options` (1:N)
- `products` → `variant_groups` (N:1 для вариантов)

### Категории (Categories)
- `categories` → `category_descriptions` (1:1)
- `categories` → `categories` (рекурсивная связь через parent_id)

### Атрибуты (Attributes)
- `attributes` → `attribute_options` (1:N)
- `attributes` → `attribute_groups` (N:M через `attribute_group_links`)
- `attributes` → `product_attribute_values` (1:N)

### Заказы (Orders)
- `cart` → `order` (1:1 после оформления)
- `order` → `order_item` (1:N)
- `order` → `order_address` (1:2, доставка и оплата)
- `order` → `order_activity` (1:N)
- `order` → `payment_transaction` (1:N)
- `order` → `shipment` (1:N)

### Корзина (Cart)
- `cart` → `cart_item` (1:N)
- `cart` → `cart_address` (1:2)
- `cart` → `customer` (N:1, nullable для гостей)

### Покупатели (Customers)
- `customer` → `customer_group` (N:1)
- `customer` → `customer_address` (1:N)
- `customer` → `order` (1:N)
- `customer` → `reset_password_token` (1:N)

### Доставка (Shipping)
- `shipping_zone` → `shipping_zone_province` (1:N)
- `shipping_zone` → `shipping_zone_method` (1:N)
- `shipping_method` → `shipping_zone_method` (1:N)

### Налоги (Taxes)
- `tax_class` → `tax_rate` (1:N)
- `tax_class` → `products` (1:N)

---

## Типичные типы данных

### UUID полях
- Тип: `VARCHAR(36)` или `UUID`
- Формат: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Временные метки
- `created_at`, `updated_at` - обычно `TIMESTAMP WITH TIME ZONE`
- Формат: ISO 8601

### JSON поля
- `product_custom_options`, `variant_options`, `settings`, `condition`, `sess` и др.
- Тип: `JSONB` (PostgreSQL)

### Денежные значения
- `price`, `amount`, `discount_amount` и др.
- Тип: `DECIMAL(12,2)` или `MONEY`

### Boolean поля
- `is_required`, `is_enabled`, `status` (0/1 или true/false)
- Тип: `BOOLEAN` или `SMALLINT`

---

## Рекомендации при генерации миграций

### 1. Порядок создания таблиц
Соблюдайте зависимости внешних ключей:
1. Независимые таблицы: `admin_user`, `customer_group`, `tax_class`, `attribute_groups`, `collections`, `session`, `migration`, `settings`
2. Первый уровень зависимостей: `customer`, `attributes`, `shipping_zone`, `shipping_method`, `tax_rate`, `cms_page`, `widget`
3. Второй уровень: `customer_address`, `attribute_options`, `attribute_group_links`, `categories`, `shipping_zone_province`, `shipping_zone_method`, `cms_page_description`
4. Третий уровень: `variant_groups`, `category_descriptions`, `reset_password_token`
5. Товары: `products`, затем `product_descriptions`, `product_images`, `product_inventory`, `product_attribute_values`, `product_custom_options`, `product_collections`
6. Корзины и заказы: `cart` → `cart_item`, `cart_address` → `order` → `order_item`, `order_address`, `order_activity`, `payment_transaction`, `shipment`
7. SEO: `url_rewrite`, `coupon`, `event`

### 2. Обязательные поля
- Почти все таблицы имеют `uuid` (VARCHAR(36) или UUID)
- Многие таблицы имеют `created_at`, `updated_at` (TIMESTAMP)
- Primary keys обычно INTEGER AUTOINCREMENT

### 3. Индексы
Рекомендуется создавать индексы на:
- Все внешние ключи
- `uuid` поля (UNIQUE)
- `email` (UNIQUE где применимо)
- `sku` в products (UNIQUE)
- `url_key` в descriptions (UNIQUE)
- `request_path` в url_rewrite
- `created_at` для таблиц с логами

### 4. Значения по умолчанию
- `status` обычно = 1 (активен)
- `created_at`, `updated_at` = CURRENT_TIMESTAMP
- `uuid` = генерируется автоматически (функцией или триггером)
- `qty` = 0
- `sort_order` = 0

---

## Примеры данных

### Создание товара
```sql
-- 1. Создать товар
INSERT INTO products (uuid, type, sku, price, weight, status) 
VALUES (UUID(), 'simple', 'LAPTOP-001', 999.99, 2.5, 1);

-- 2. Добавить описание
INSERT INTO product_descriptions (product_description_product_id, name, url_key, description)
VALUES (LAST_INSERT_ID(), 'Ноутбук Pro 15', 'laptop-pro-15', '<p>Описание...</p>');

-- 3. Добавить изображение
INSERT INTO product_images (product_image_product_id, path, main_image)
VALUES (LAST_INSERT_ID(), '/images/laptop.jpg', 1);
```

### Создание заказа
```sql
-- Заказ создается из корзины
-- 1. Корзина превращается в заказ
-- 2. cart_item копируются в order_item
-- 3. cart_address копируются в order_address
```

---

**Последнее обновление**: 2025-10-30

**Примечание**: Этот файл следует обновлять при изменении структуры БД или добавлении новых таблиц.






