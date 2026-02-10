# Настройка Shipping API расширения

## Где хранятся настройки?

Настройки хранятся в таблице `setting` в базе данных EverShop.

## Как добавить настройки?

### Способ 1: Через SQL (рекомендуется)

Выполните SQL скрипт `setup-shipping-api-config.sql` в вашей базе данных PostgreSQL:

```bash
psql -h localhost -U your_user -d your_database -f extensions/shipping-api/setup-shipping-api-config.sql
```

Или подключитесь к базе данных и выполните SQL вручную:

```sql
INSERT INTO setting (name, value, is_json) 
VALUES (
  'shipping_api',
  '{
    "providers": {
      "postnord": {
        "enabled": true,
        "api_key": "YOUR_POSTNORD_API_KEY_HERE",
        "api_secret": "YOUR_POSTNORD_API_SECRET_HERE",
        "from_address": {
          "countryCode": "NO",
          "postalCode": "0001",
          "city": "Oslo",
          "streetName": "Karl Johans gate",
          "streetNumber": "1"
        },
        "sender_email": "seller@example.com"
      }
    }
  }',
  true
)
ON CONFLICT (name) DO UPDATE 
SET value = EXCLUDED.value, is_json = EXCLUDED.is_json;
```

### Способ 2: Через админ-панель (если есть интерфейс)

Если в будущем будет создан интерфейс в админ-панели, настройки можно будет добавить через него.

## Структура JSON конфигурации

```json
{
  "providers": {
    "postnord": {
      "enabled": true,                    // Включен ли провайдер
      "api_key": "ваш_api_ключ",          // API ключ от PostNord (обязательно)
      "api_secret": "ваш_api_secret",     // API секрет от PostNord (опционально)
      "from_address": {                   // Адрес отправителя (обязательно)
        "countryCode": "NO",              // Код страны (ISO 3166-1 alpha-2)
        "postalCode": "0001",             // Почтовый индекс
        "city": "Oslo",                   // Город
        "streetName": "Karl Johans gate", // Название улицы
        "streetNumber": "1"               // Номер дома
      },
      "sender_email": "seller@example.com" // Email продавца для получения QR кодов (обязательно)
    }
  }
}
```

## Что нужно заполнить?

### 1. API ключи от PostNord

Получите API ключи от PostNord:
- `api_key` - основной API ключ (обязательно)
- `api_secret` - секретный ключ (опционально, если требуется)

**Где получить:** Обратитесь в PostNord для получения API ключей для sandbox или production окружения.

### 2. Адрес отправителя (`from_address`)

Заполните адрес вашего склада/магазина, откуда будут отправляться товары:

- `countryCode` - код страны (например, "NO" для Норвегии)
- `postalCode` - почтовый индекс
- `city` - город
- `streetName` - название улицы
- `streetNumber` - номер дома

**Пример для Норвегии:**
```json
"from_address": {
  "countryCode": "NO",
  "postalCode": "0150",
  "city": "Oslo",
  "streetName": "Storgata",
  "streetNumber": "1"
}
```

### 3. Email продавца (`sender_email`)

Email адрес, на который будут приходить уведомления с QR кодами для отправки товаров.

**Пример:**
```json
"sender_email": "orders@yourstore.com"
```

## Проверка настроек

После добавления настроек проверьте, что они сохранены:

```sql
SELECT name, value, is_json FROM setting WHERE name = 'shipping_api';
```

Должна вернуться одна запись с `name = 'shipping_api'` и `is_json = true`.

## Обновление настроек

Если нужно обновить настройки, выполните тот же SQL запрос с новыми значениями. Запрос использует `ON CONFLICT DO UPDATE`, поэтому он обновит существующую запись или создаст новую.

## Важные примечания

1. **Sandbox окружение**: По умолчанию используется sandbox URL PostNord API. Для production нужно будет обновить `api_base_url` в конфигурации.

2. **Формат адреса**: Адрес должен быть в формате PostNord (структурированный формат с отдельными полями для названия улицы и номера дома).

3. **Email уведомления**: Email с QR кодами будет отправляться автоматически после создания отправления в PostNord.

4. **Безопасность**: Не коммитьте SQL файлы с реальными API ключами в Git! Используйте переменные окружения или храните ключи в безопасном месте.

