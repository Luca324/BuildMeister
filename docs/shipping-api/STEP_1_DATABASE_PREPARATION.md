# Шаг 1: Подготовка базы данных

## Цель
Подготовить структуру БД для хранения габаритов товаров и метаданных отправлений от провайдеров доставки.

---

## Миграция 1: Добавление габаритов в таблицу PRODUCTS

### SQL команды

```sql
-- Добавление полей для габаритов товаров (длина, ширина, высота в см)
-- Используем numeric(12,4) для совместимости с типом weight в таблице product
ALTER TABLE product 
ADD COLUMN IF NOT EXISTS length_cm numeric(12,4) NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS width_cm numeric(12,4) NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS height_cm numeric(12,4) NOT NULL DEFAULT 10;

-- Добавление комментариев к полям для ясности
COMMENT ON COLUMN product.length_cm IS 'Длина товара в сантиметрах (обязательное поле)';
COMMENT ON COLUMN product.width_cm IS 'Ширина товара в сантиметрах (обязательное поле)';
COMMENT ON COLUMN product.height_cm IS 'Высота товара в сантиметрах (обязательное поле)';

-- Добавление проверочных ограничений (аналогично UNSIGNED_WEIGHT)
ALTER TABLE product 
ADD CONSTRAINT UNSIGNED_LENGTH CHECK (length_cm >= 0::numeric),
ADD CONSTRAINT UNSIGNED_WIDTH CHECK (width_cm >= 0::numeric),
ADD CONSTRAINT UNSIGNED_HEIGHT CHECK (height_cm >= 0::numeric);
```

### Важные примечания:

1. **Значения по умолчанию**: 
   - Установлены для существующих товаров (20x15x10 см)
   - После заполнения реальных данных для всех товаров можно убрать DEFAULT
   - Но для новых товаров лучше оставить, чтобы админ не забывал заполнять

2. **Обязательность полей**:
   - Поля обязательные (NOT NULL)
   - В админке при создании/редактировании товара эти поля должны быть обязательными для заполнения
   - Если товар не заполнен - используется значение по умолчанию при расчете доставки

3. **Единицы измерения**:
   - Все значения в сантиметрах (cm)
   - При передаче в PostNord API нужно будет конвертировать в нужный формат (если требуется)

---

## Миграция 2: Расширение таблицы SHIPMENT

### SQL команды

```sql
-- Добавление полей для метаданных провайдеров доставки
-- Используем character varying для совместимости с типом carrier в таблице shipment
ALTER TABLE shipment 
ADD COLUMN IF NOT EXISTS provider_code character varying(50),
ADD COLUMN IF NOT EXISTS provider_order_id character varying(255),
ADD COLUMN IF NOT EXISTS qr_code_url character varying(500),
ADD COLUMN IF NOT EXISTS label_url character varying(500),
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Добавление комментариев
COMMENT ON COLUMN shipment.provider_code IS 'Код провайдера доставки (postnord, helthjem, bring)';
COMMENT ON COLUMN shipment.provider_order_id IS 'ID заказа в системе провайдера (если отличается от tracking_number)';
COMMENT ON COLUMN shipment.qr_code_url IS 'URL QR кода для отправки (для продавца)';
COMMENT ON COLUMN shipment.label_url IS 'URL этикетки для печати (если доступен)';
COMMENT ON COLUMN shipment.metadata IS 'Дополнительные метаданные в формате JSON';

-- Индекс для быстрого поиска по провайдеру
CREATE INDEX IF NOT EXISTS idx_shipment_provider_code ON shipment(provider_code);

-- Индекс для поиска по provider_order_id
CREATE INDEX IF NOT EXISTS idx_shipment_provider_order_id ON shipment(provider_order_id) 
WHERE provider_order_id IS NOT NULL;
```

### Важные примечания:

1. **Совместимость с полем carrier**:
   - В таблице `shipment` уже существует поле `carrier` (character varying)
   - Это поле используется для хранения названия перевозчика в человекочитаемом формате
   - Поле `provider_code` хранит код провайдера для программной обработки (`postnord`, `helthjem`, `bring`)
   - При создании отправления через API: `carrier` = "PostNord", `provider_code` = "postnord"
   - Для старых отправлений `provider_code` может быть NULL

2. **provider_code**:
   - Хранит код провайдера: `postnord`, `helthjem`, `bring`
   - Используется для определения, какой адаптер использовать для отслеживания
   - Может быть NULL для старых отправлений или самовывоза

2. **provider_order_id**:
   - ID заказа в системе провайдера (может отличаться от tracking_number)
   - Используется для отмены отправления или получения дополнительной информации

3. **qr_code_url**:
   - URL QR кода, который получает продавец на email
   - Продавец использует этот QR код в отделении PostNord для отправки товара
   - Может быть NULL, если провайдер не предоставляет QR код

4. **label_url**:
   - URL этикетки для печати (если провайдер предоставляет)
   - Может быть NULL, если не требуется или не предоставляется

5. **metadata**:
   - JSONB поле для хранения дополнительных данных
   - Пример структуры:
     ```json
     {
       "deliveryOptionId": "12345",
       "serviceCode": "SERVICE_123",
       "estimatedDays": 5,
       "pickupPoint": {
         "id": "123",
         "name": "PostNord Punkt",
         "address": "..."
       }
     }
     ```

---

## Миграция 3: Проверка существующих данных

### SQL команды для проверки

```sql
-- Проверить, есть ли товары без габаритов (должны использовать значения по умолчанию)
SELECT 
  product_id, 
  sku, 
  length_cm, 
  width_cm, 
  height_cm,
  weight
FROM product 
WHERE length_cm = 20 AND width_cm = 15 AND height_cm = 10
LIMIT 10;

-- Проверить существующие отправления (для совместимости)
SELECT 
  shipment_id,
  carrier,
  tracking_number,
  provider_code
FROM shipment
LIMIT 10;
```

---

## Порядок выполнения миграций

1. **Выполнить миграцию 1** (габариты товаров)
2. **Выполнить миграцию 2** (расширение shipment)
3. **Выполнить проверку** (миграция 3)
4. **Заполнить реальные габариты** для существующих товаров через админку (опционально, но рекомендуется)

---

## Откат миграций (если потребуется)

```sql
-- Откат миграции 2
DROP INDEX IF EXISTS idx_shipment_provider_code;
DROP INDEX IF EXISTS idx_shipment_provider_order_id;

ALTER TABLE shipment 
DROP COLUMN IF EXISTS provider_code,
DROP COLUMN IF EXISTS provider_order_id,
DROP COLUMN IF EXISTS qr_code_url,
DROP COLUMN IF EXISTS label_url,
DROP COLUMN IF EXISTS metadata;

-- Откат миграции 1
ALTER TABLE product 
DROP CONSTRAINT IF EXISTS UNSIGNED_LENGTH,
DROP CONSTRAINT IF EXISTS UNSIGNED_WIDTH,
DROP CONSTRAINT IF EXISTS UNSIGNED_HEIGHT;

ALTER TABLE product 
DROP COLUMN IF EXISTS length_cm,
DROP COLUMN IF EXISTS width_cm,
DROP COLUMN IF EXISTS height_cm;
```

---

## Следующие шаги после выполнения миграций

1. Обновить форму создания/редактирования товара в админке:
   - Добавить поля length_cm, width_cm, height_cm
   - Сделать их обязательными для заполнения
   - Добавить валидацию (положительные числа)

2. Обновить схему БД в DATABASE_SCHEMA.md:
   - Добавить новые поля в описание таблиц
   - Обновить связи и примеры

3. Перейти к Шагу 2: Создание базового адаптера

