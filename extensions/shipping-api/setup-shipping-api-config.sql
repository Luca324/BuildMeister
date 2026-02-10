-- SQL скрипт для настройки Shipping API расширения
-- Выполните этот скрипт в базе данных PostgreSQL

-- ВАЖНО: Замените значения ниже на ваши реальные данные перед выполнением!

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

-- Проверка, что настройка добавлена:
SELECT name, value, is_json FROM setting WHERE name = 'shipping_api';

