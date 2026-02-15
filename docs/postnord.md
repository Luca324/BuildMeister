  

### 3. POSTNORD API

  

#### Необходимые интерфейсы:

- Pre-Order APIs → Delivery Options API — варианты доставки

- Booking API — создание заказа

- Track Shipment API — отслеживание (уже используется)

  

#### Параметры для расчета:

```json

{

  "fromCountryCode": "NO",

  "fromPostalCode": "0001",

  "toCountryCode": "NO",

  "toPostalCode": "0165",

  "weight": {

    "value": 2.0,

    "unit": "kg"

  },

  "dimensions": {

    "length": 30,

    "width": 20,

    "height": 15,

    "unit": "cm"

  },

  "declaredValue": {

    "amount": 1000,

    "currency": "NOK"

  }

}

```

  

#### Формат адреса:

PostNord требует структурированный адрес:

```json

{

  "streetName": "Karl Johans gate",

  "streetNumber": "1",

  "postalCode": "0165",

  "city": "Oslo",

  "countryCode": "NO"

}

```

  

#### Проверка доступности:

- Delivery Options API возвращает доступные варианты

- Если `deliveryOptions` пустой — адрес недоступен

  

#### Полный флоу:

1. Получение вариантов: `POST /api/pre-order/delivery-options`

2. Выбор покупателем варианта

3. Создание заказа: `POST /api/pre-order/bookings` с выбранным `deliveryOptionId`

4. Получение `trackingNumber` из ответа booking

5. Сохранение в `shipment`

  

Оплата при получении: поддерживается через `cashOnDelivery` в booking API.

  
## Преобразование адреса из БД

  

Ваша структура (`ORDER_ADDRESS`):

```sql

full_name, postcode, telephone, country, province, city, address_1, address_2

```
### Для PostNord:

```javascript

// Нужно парсить address_1 для извлечения номера дома

const streetMatch = orderAddress.address_1.match(/^(.+?)\s+(\d+.*)$/);

{

  streetName: streetMatch ? streetMatch[1] : orderAddress.address_1,

  streetNumber: streetMatch ? streetMatch[2] : '',

  postalCode: orderAddress.postcode,

  city: orderAddress.city,

  countryCode: orderAddress.country

}

```

  

1. Покупатель выбирает сервис и видит цену → расчет через API

2. Оформляет заказ → создается запись в `order`

3. Получается `tracking_number` → создается запись в `shipment`

4. Админ передает товар курьеру → физическая передача

5. Покупатель оплачивает при получении → COD поддерживается всеми тремя

    

Важно: для Bring и PostNord может потребоваться предварительная регистрация/договор с сервисом для получения API ключей и активации COD.

## Рекомендуемая архитектура

  

### Структура модуля:

```

services/

  shipping/

    adapters/

      BringAdapter.js

      HelthjemAdapter.js

      PostNordAdapter.js

    ShippingService.js  // единый интерфейс

    addressMapper.js    // преобразование адресов

```

  

### Последовательность вызовов (универсальная):

1. Валидация адреса получателя

2. Расчет стоимости (все три сервиса параллельно)

3. Показ вариантов покупателю

4. После выбора → создание заказа в выбранном сервисе

5. Сохранение tracking_number в БД

6. Отслеживание статуса (уже реализовано)

  

---

  

## Что нужно для реализации

  

1. API ключи для всех трех сервисов

2. Тестовые аккаунты для проверки COD

3. Таблица для хранения настроек API (можно в `settings`)

4. Обработка ошибок и фолбэк

5. Логирование всех запросов

6. Тестирование на реальных адресах

  

Нужна помощь с реализацией конкретного адаптера или общей архитектуры?

  

---