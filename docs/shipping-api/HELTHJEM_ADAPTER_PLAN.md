# План реализации HelthjemAdapter

## Цель
Создать адаптер для интеграции с Helthjem API, аналогичный PostNordAdapter, с учетом особенностей и различий API Helthjem.

---

## Архитектура адаптера

### Структура файла

```
extensions/shipping-api/src/adapters/
├── BaseShippingAdapter.ts      # Базовый класс (уже существует)
├── PostNordAdapter.ts         # Реализация PostNord (уже существует)
└── HelthjemAdapter.ts         # Новая реализация Helthjem
```

### Наследование

HelthjemAdapter наследуется от `BaseShippingAdapter` и реализует те же методы:
- `getProviderCode()` → `'helthjem'`
- `getProviderName()` → `'Helthjem'`
- `calculateShipping()` → расчет стоимости доставки
- `createBooking()` → создание отправления
- `trackShipment()` → отслеживание статуса

---

## Анализ API Helthjem

### Базовый URL
- **Pre-production (sandbox)**: `https://api.pre.helthjem.no`
- **Production**: `https://api.helthjem.no` (нужно уточнить)

### Основные endpoints (из документации)

1. **OAuth2 Authentication** (`POST /auth/oauth2/v1/token`)
   - Получение JWT токена для авторизации
   - Использует `client_id` и `client_secret`
   - Возвращает `token`, `expires_in` (в секундах), `token_type: "Bearer"`
   - **КРИТИЧЕСКОЕ ОТЛИЧИЕ ОТ POSTNORD**: Требует OAuth2 flow

2. **Check Coverage** (`POST /parcels/v1/addresses/find/single`)
   - Проверка доступности доставки по адресу для конкретного Transport Solution
   - Возвращает информацию о маршруте и handover point
   - **ВАЖНО**: Не возвращает цену, только подтверждение доступности

3. **Find Service Points** (`POST /parcels/v1/service-points/nearby`)
   - Поиск 3 ближайших пунктов выдачи заказов
   - Возвращает список service points, сгруппированных по freight products
   - Используется для выбора пункта самовывоза

4. **Parcel Booking** (`POST /parcels/v1/bookings`)
   - Создание отправления
   - Возвращает `order_id` (например, "HH-20250101-12345") и `tracking_identifier`
   - **ВАЖНО**: Структура запроса сильно отличается от PostNord

5. **Label Printing** (`GET /parcels/v1/labels/{identifier}/{labelType}`)
   - Генерация этикетки для печати
   - `identifier` может быть `trackingReference` или `shipmentId`
   - `labelType`: `unified-large` (единственный вариант)
   - Форматы: PDF, PNG, SVG, ZPL (задается через заголовок `Accept`)

6. **Tracking** (`GET /parcels/v1/tracking/fetch/{identifier}/NO/false`)
   - Получение полной истории событий отслеживания
   - Возвращает массив с информацией о посылке, статусе и событиях

### Отличия от PostNord API

#### 1. Структура расчета стоимости

**PostNord:**
- Один endpoint: `POST /api/pre-order/delivery-options`
- Возвращает массив вариантов доставки с ценами
- Варианты включают `deliveryOptionId` для последующего создания заказа

**Helthjem:**
- **ПРОБЛЕМА**: В документации нет отдельного endpoint для расчета стоимости!
- `POST /parcels/v1/addresses/find/single` проверяет только доступность адреса
- `POST /parcels/v1/service-points/nearby` возвращает service points
- **КРИТИЧЕСКОЕ ОТЛИЧИЕ**: Нужно проверить, есть ли endpoint для получения цен или цена определяется при создании booking
- Возможно, цена фиксированная или рассчитывается на основе веса/габаритов при создании посылки

#### 2. Формат адреса

**PostNord:**
```json
{
  "countryCode": "NO",
  "postalCode": "0165",
  "city": "Oslo",
  "streetName": "Karl Johans gate",
  "streetNumber": "1"
}
```

**Helthjem:**
- **ОТЛИЧИЕ**: Адрес в одном поле `address` (комбинированная строка)
- Формат: "Street name, street number, Entrance, Apartment number"
- Пример: `"Vøyensvingen 10 H0202"` или `"Storgata 15A H0202"`
- Отдельные поля: `zipCode`, `postalName` (город), `countryCode`
- **ВАЖНО**: Нужно объединять `streetName` и `streetNumber` в одно поле `address`

#### 3. Создание отправления

**PostNord:**
- `POST /api/pre-order/bookings`
- Использует `deliveryOptionId` из расчета стоимости
- Возвращает `trackingNumber`, `bookingId`, `qrCodeUrl`, `labelUrl`

**Helthjem:**
- `POST /parcels/v1/bookings`
- Структура запроса сильно отличается:
  - Требует `shopId` (integer) - идентификатор магазина
  - Требует `transportSolutionId` (integer) - ID транспортного решения
  - Требует `shipmentId` (string) - уникальный идентификатор отправления (например, order ID)
  - `parties` - массив из 2-3 объектов (consignee и consignor)
  - `items` - массив объектов с информацией о посылке
- Возвращает `order_id` (например, "HH-20250101-12345") и `tracking_identifier`
- Этикетка получается отдельным запросом через `/parcels/v1/labels/{identifier}/{labelType}`

#### 4. Авторизация

**PostNord:**
- Bearer token в заголовке `Authorization: Bearer {api_key}`
- API key получается при регистрации

**Helthjem:**
- **OAuth2 Client Credentials Flow**
- Требует два шага:
  1. Получение JWT токена через `POST /auth/oauth2/v1/token`
     - Тело запроса: `{ "client_id": "...", "client_secret": "...", "grant_type": "client_credentials" }`
     - Ответ: `{ "token": "...", "expires_in": 86400, "token_type": "Bearer" }`
  2. Использование токена в заголовке `Authorization: Bearer {token}`
- Токен действителен 86400 секунд (24 часа)
- **КРИТИЧЕСКОЕ ОТЛИЧИЕ**: Требует управления токенами и их обновления

#### 5. Обработка ошибок

**PostNord:**
- Стандартные HTTP коды ошибок
- Сообщения об ошибках в теле ответа

**Helthjem:**
- Нужно проверить формат ошибок
- Возможно другая структура сообщений об ошибках
- Могут быть специфичные коды ошибок для разных сценариев

---

## Движение данных

### 1. Расчет стоимости доставки (`calculateShipping`)

#### Входные данные (стандартные для всех адаптеров):
```typescript
ShippingCalculationRequest {
  from: Address,
  to: Address,
  weight: number,        // кг
  dimensions: {
    length: number,     // см
    width: number,
    height: number
  },
  declaredValue?: {
    amount: number,
    currency: string
  }
}
```

#### Процесс для Helthjem:

**Шаг 1: Проверка доступности адреса**
```
POST /parcels/v1/addresses/find/single
Headers: {
  Authorization: Bearer {access_token}
}
Body: {
  shopId: integer,              // из конфигурации
  transportSolutionId: integer,  // из конфигурации или нужно получить список
  address: "Storgata 15A H0202", // объединенный адрес
  zipCode: "0161",
  postalName: "Oslo",
  countryCode: "NO",
  "customer name": "John Doe",  // опционально
  weight: 1000                  // в граммах, опционально
}
Response: {
  productName: "HELTHJEM",
  routeName: "21516",
  companyId: 1,
  routing: "1-31/114-43-x21516x385",
  routingCode: "1",
  routeAddress: "TÅSENVEIEN 26",
  routeDescription: "BUDSENTRAL TÅSEN 1",
  handoverId: 3223047,
  handoverCity: "OSLO",
  handoverZipCode: "484",
  handoverStreetName: "SANDAKERVEIEN",
  handoverStreetNumber: 121,
  handoverDescription: "MNO TRYKK NYDALEN",
  routingDescription: "DROPP 1 TÅSEN",
  plannedDeparture: "1600"
}
```

**Шаг 2: Получение вариантов доставки**
- **ПРОБЛЕМА**: В документации нет endpoint для получения цен!
- Возможные варианты:
  1. Цена фиксированная и известна заранее
  2. Цена рассчитывается при создании booking
  3. Есть отдельный endpoint, который не описан в документации
- **РЕШЕНИЕ**: Нужно уточнить у Helthjem или использовать фиксированные цены для разных типов посылок

**Шаг 3: Нормализация данных**
```typescript
ShippingOption[] {
  id: string,              // serviceId или parcelTypeId
  name: string,            // название сервиса
  price: number,           // цена
  currency: string,        // NOK
  estimatedDays?: number,  // срок доставки
  serviceCode?: string,    // код сервиса
  provider: 'helthjem',
  metadata: {
    serviceId: string,
    parcelTypeId?: string,
    servicePointId?: string,  // если выбран пункт самовывоза
    ...другие данные от API
  }
}
```

#### Важные моменты:

1. **Отсутствие endpoint для расчета стоимости**: 
   - В документации нет отдельного endpoint для получения цен
   - `POST /parcels/v1/addresses/find/single` только проверяет доступность адреса
   - **КРИТИЧЕСКАЯ ПРОБЛЕМА**: Нужно уточнить у Helthjem, как получать цены
2. **Service Points через отдельный endpoint**:
   - `POST /parcels/v1/service-points/nearby` возвращает 3 ближайших пункта выдачи
   - Возвращает список, сгруппированный по freight products
   - Каждый service point имеет `servicePointExternalId`, адрес, координаты, часы работы
   - Может использоваться для выбора пункта самовывоза
3. **Transport Solution ID**:
   - Обязателен для всех запросов
   - Определяет тип доставки (например, до адреса или до пункта выдачи)
   - Нужно получить список доступных transport solutions для магазина
4. **Формат ответа coverage**:
   - Возвращает информацию о маршруте, handover point, planned departure
   - НЕ возвращает цену
   - Подтверждает только доступность адреса для конкретного transport solution

---

### 2. Создание отправления (`createBooking`)

#### Входные данные:
```typescript
ShippingBookingRequest {
  selectedOptionId: string,    // ID выбранного варианта из calculateShipping
  orderId: string,
  orderNumber: string,
  from: Address,
  to: Address,
  recipient: {
    name: string,
    phone: string,
    email?: string
  },
  weight: number,
  dimensions: { length, width, height },
  declaredValue?: { amount, currency }
}
```

#### Процесс для Helthjem:

**Шаг 1: Подготовка запроса**
```
POST /parcels/v1/bookings
Headers: {
  Authorization: Bearer {access_token},
  Content-Type: application/json
}
Body: {
  shopId: integer,              // из конфигурации
  transportSolutionId: integer,  // из selectedOptionId или метаданных
  shipmentId: string,           // order ID или order number
  parties: [
    {
      type: "consignee",        // получатель
      name: string,
      countryCode: "NO",
      postalName: string,       // город
      zipCode: string,
      address: string,          // объединенный адрес
      phone1: string,
      email?: string,
      reference?: string,       // опционально
      contact?: string          // опционально
    },
    {
      type: "consignor",        // отправитель
      name: string,
      countryCode: "NO",
      postalName: string,
      zipCode: string,
      address: string,
      phone1: string,
      email?: string,
      reference?: string,
      contact?: string
    }
  ],
  items: [
    {
      itemNumber: 1,
      trackingReference: "",    // опционально
      weight: integer,          // в граммах!
      width: number,            // в см
      height: number,           // в см
      length: number,           // в см
      contents?: string         // описание содержимого
    }
  ]
}
```

**Шаг 2: Получение ответа**
```
Response: {
  order_id: "HH-20250101-12345",      // ID заказа в системе Helthjem
  tracking_identifier: "HJT123456789" // tracking number для отслеживания
}
```

**Шаг 3: Получение этикетки**
```
GET /parcels/v1/labels/{identifier}/{labelType}
Headers: {
  Authorization: Bearer {access_token},
  Accept: application/pdf  // или image/png, image/svg+xml, application/zpl
}
Path Parameters:
  identifier: tracking_identifier или order_id
  labelType: "unified-large"
Response: PDF файл (бинарные данные)
```

**Шаг 4: Нормализация результата**
```typescript
ShippingBookingResult {
  trackingNumber: string,
  bookingId: string,      // parcelId из Helthjem
  qrCodeUrl?: string,      // если есть
  labelUrl: string,        // URL или путь к файлу
  metadata: {
    parcelId: string,
    servicePointId?: string,
    ...другие данные
  }
}
```

#### Важные моменты:

1. **Order ID vs Booking ID**: Helthjem использует `order_id` (например, "HH-20250101-12345"), нужно маппить на `bookingId` для единообразия
2. **Этикетка отдельно**: Этикетка получается отдельным GET запросом после создания booking
3. **Service Point**: Если выбран пункт самовывоза, нужно передать `servicePointId` (но в документации не указано, как именно)
4. **QR код**: В документации не упоминается QR код, возможно он часть этикетки или получается отдельно
5. **Вес в граммах**: Helthjem требует вес в граммах (integer), а не в килограммах!

---

### 3. Отслеживание (`trackShipment`)

#### Процесс:

```
GET /parcels/v1/tracking/fetch/{identifier}/NO/false
Headers: {
  Authorization: Bearer {access_token}
}
Path Parameters:
  identifier: tracking_identifier или order_id
  NO: страна (фиксированное значение)
  false: boolean (фиксированное значение)

Response: [
  {
    shipmentNumber: "70724763243779244",
    shopName: "Testbutikken",
    shopId: 1,
    consigneeReference: "cust_ref",
    consignorReference: "shop_ref",
    properties: {},
    items: [
      {
        trackingNumber: "370724763243779252",
        returnCode: null,
        freightProductId: 1,
        freightProductName: "helthjem",
        parcelStatus: "WAITING_FOR_PACKAGE",
        linkedParcelNumbers: [],
        events: [
          {
            eventTime: "2025-10-13 13:50:03",
            eventTimeUtc: "2025-10-13T11:50:03.390000Z",
            lat: null,
            lon: null,
            locationContext: "Testbutikken",
            locationContextId: null,
            eventType: {
              apiKey: "007",
              description: "Address collector sendt til mottaker",
              i18nKey: "event.type.distr.requested.consignee.addresscollect"
            },
            additionalInfo: null,
            eventGroup: {
              id: 3,
              name: "event.type.group.communication"
            },
            comChannelType: null
          }
        ]
      }
    ]
  }
]
```

#### Нормализация статусов:

```typescript
// Маппинг статусов Helthjem → EverShop
// На основе parcelStatus из ответа tracking
const statusMap = {
  'WAITING_FOR_PACKAGE': 'pending',      // Ожидание посылки
  'REGISTERED': 'processing',            // Зарегистрировано
  'IN_TRANSIT': 'shipped',               // В пути
  'OUT_FOR_DELIVERY': 'shipped',        // На доставке
  'DELIVERED': 'delivered',             // Доставлено
  'FAILED': 'canceled',                 // Не удалось доставить
  'CANCELLED': 'canceled'                // Отменено
};
```

#### Важные моменты:

1. **Формат ответа**: Возвращает массив с информацией о посылке и событиях
2. **Статус в items**: Текущий статус находится в `parcelStatus` каждого item
3. **События**: История событий в массиве `events` каждого item
4. **Локация**: Может быть в `locationContext` или `lat`/`lon` событий

---

## Конфигурация

### Хранение в SETTINGS

```json
{
  "shipping_api": {
    "providers": {
        "helthjem": {
          "enabled": true,
          "client_id": "...",           // OAuth2 client_id (аналог api_key)
          "client_secret": "...",        // OAuth2 client_secret (обязательно!)
          "shop_id": 1,                  // ID магазина в системе Helthjem
          "transport_solution_id": 2,   // ID транспортного решения (по умолчанию)
          "from_address": {
            "countryCode": "NO",
            "postalCode": "0001",
            "postalName": "Oslo",
            "address": "Karl Johans gate 1"  // объединенный адрес
          },
          "sender_email": "seller@example.com",
          "api_base_url": "https://api.pre.helthjem.no"  // sandbox или production
        }
    }
  }
}
```

### Отличия от PostNord конфигурации:

1. **OAuth2 вместо простого API key**:
   - `client_id` вместо `api_key`
   - `client_secret` обязателен (не опциональный)
   - Требуется OAuth2 flow для получения access token
2. **Дополнительные обязательные поля**:
   - `shop_id` (integer) - идентификатор магазина в системе Helthjem
   - `transport_solution_id` (integer) - ID транспортного решения по умолчанию
3. **Формат адреса отправителя**:
   - `address` - объединенный адрес (streetName + streetNumber)
   - `postalName` вместо `city`
   - `postalCode` вместо `postcode`

---

## Потенциальные проблемы совместимости

### 1. Различия в структуре API

**Проблема**: Helthjem может использовать другую структуру запросов/ответов

**Решение**: 
- Создать отдельные интерфейсы для Helthjem API
- Использовать маппинг данных в адаптере
- Сохранять оригинальные данные в `metadata` для отладки

### 2. Двухэтапный процесс расчета

**Проблема**: PostNord возвращает варианты одним запросом, Helthjem может требовать два запроса

**Решение**:
- Реализовать последовательные запросы в `calculateShipping()`
- Обработать случаи, когда первый запрос не прошел
- Кэшировать результат coverage check (опционально)

### 3. Service Points (пункты самовывоза)

**Проблема**: Helthjem может предлагать выбор пункта самовывоза, что не предусмотрено в текущей архитектуре

**Решение**:
- Добавить поддержку service points в `ShippingOption.metadata`
- При создании заказа проверять наличие `servicePointId` в метаданных
- Передавать `servicePointId` при создании посылки

### 4. Различия в формате адреса

**Проблема**: Helthjem требует объединенный адрес в одном поле `address` вместо раздельных полей `streetName` и `streetNumber`

**Решение**:
- Расширить `AddressMapper` для поддержки формата Helthjem
- Объединять `streetName` и `streetNumber` в одно поле `address`
- Включать `address_2` (если есть) в объединенный адрес
- Пример: `"Karl Johans gate 1"` или `"Storgata 15A H0202"` (если есть apartment number)

### 5. Различия в авторизации (КРИТИЧЕСКОЕ ОТЛИЧИЕ)

**Проблема**: Helthjem использует OAuth2 Client Credentials Flow вместо простого Bearer token
- Требуется получение access token перед каждым запросом (или кэширование токена)
- Access token имеет срок действия (86400 секунд = 24 часа), нужно обновлять при истечении
- Требует `client_id` и `client_secret` вместо простого `api_key`
- Более сложная логика обработки ошибок авторизации (401 может означать истекший токен)

**Решение**:
- Реализовать метод `getAccessToken()` для получения токена через OAuth2
- Кэшировать access token с учетом времени жизни (TTL)
- При ошибке 401 - обновить токен и повторить запрос
- Хранить `client_id` и `client_secret` в конфигурации вместо `api_key`
- Реализовать автоматическое обновление токена при истечении
- Обработать race condition при параллельных запросах (чтобы не запрашивать токен несколько раз одновременно)

### 6. Обработка ошибок

**Проблема**: Формат ошибок может отличаться от PostNord

**Решение**:
- Изучить формат ошибок Helthjem API
- Адаптировать обработку ошибок под формат Helthjem
- Сохранять оригинальные сообщения об ошибках для отладки

### 7. Этикетки и QR коды

**Проблема**: Helthjem возвращает этикетки отдельным GET запросом после создания booking
- В документации не упоминается QR код, возможно он часть этикетки или получается отдельно

**Решение**:
- После создания booking получать этикетку через `GET /parcels/v1/labels/{identifier}/unified-large`
- Использовать `tracking_identifier` или `order_id` в качестве identifier
- Сохранять URL этикетки в `labelUrl` для последующего скачивания
- QR код может быть частью этикетки или отдельным запросом (нужно проверить)

### 8. Таймауты и лимиты запросов

**Проблема**: Helthjem может иметь другие лимиты на количество запросов

**Решение**:
- Установить разумные таймауты (15 секунд, как в PostNord)
- Обработать ошибки rate limiting
- Логировать все запросы для мониторинга

---

## План реализации

### Этап 1: Подготовка

1. **Изучение документации Helthjem API**
   - Проверить точные endpoints и их параметры
   - Изучить формат запросов и ответов
   - Определить метод авторизации
   - Проверить формат ошибок

2. **Создание интерфейсов TypeScript**
   - Интерфейсы для запросов Helthjem API
   - Интерфейсы для ответов Helthjem API
   - Маппинг на стандартные типы адаптера

### Этап 2: Реализация базовых методов

1. **Конфигурация и авторизация**
   - Метод `getConfig()` для получения настроек
   - Метод `getAccessToken()` для получения OAuth2 токена с кэшированием
   - Метод `makeRequest()` для HTTP запросов с автоматической авторизацией
   - Обработка истечения токена и автоматическое обновление

2. **Метод `calculateShipping()`**
   - Реализация coverage check
   - Получение вариантов доставки
   - Нормализация данных в формат `ShippingOption[]`

3. **Метод `createBooking()`**
   - Подготовка запроса создания посылки
   - Вызов API создания посылки
   - Получение этикетки (если отдельным запросом)
   - Нормализация результата

4. **Метод `trackShipment()`**
   - Запрос статуса отправления
   - Нормализация статусов в формат EverShop
   - Формирование истории статусов

### Этап 3: Обработка ошибок

1. **Обработка специфичных ошибок Helthjem**
   - Маппинг ошибок на стандартные классы ошибок
   - Логирование оригинальных сообщений
   - Обработка rate limiting

2. **Валидация данных**
   - Проверка обязательных полей
   - Валидация формата адреса
   - Проверка габаритов и веса

### Этап 4: Интеграция

1. **Регистрация адаптера**
   - Добавить в `bootstrap.ts`
   - Зарегистрировать в `ShippingProviderService`

2. **Тестирование**
   - Тестирование расчета стоимости
   - Тестирование создания посылки
   - Тестирование отслеживания
   - Тестирование обработки ошибок

### Этап 5: Документация

1. **Обновление README**
   - Добавить информацию о Helthjem
   - Примеры конфигурации
   - Описание особенностей

2. **Комментарии в коде**
   - Документировать различия с PostNord
   - Описать особенности реализации
   - Добавить примеры использования

---

## Важные моменты для реализации

### 1. Сохранение совместимости с BaseShippingAdapter

- Все методы должны возвращать данные в стандартном формате
- Использовать стандартные типы из `types.ts`
- Не нарушать интерфейс базового класса

### 2. Обработка различий в API

- Использовать маппинг данных для преобразования форматов
- Сохранять оригинальные данные в `metadata` для отладки
- Логировать все преобразования данных

### 3. Поддержка Service Points

- Если Helthjem требует выбор пункта самовывоза, нужно:
  - Добавить endpoint для получения списка service points
  - Сохранять выбранный service point в метаданных варианта доставки
  - Передавать service point при создании посылки

### 4. Тестирование

- Тестировать на реальных адресах
- Проверить все edge cases (недоступные адреса, ошибки API, и т.д.)
- Сравнить поведение с PostNord адаптером

### 5. Производительность

- Минимизировать количество запросов к API
- Использовать параллельные запросы где возможно
- Установить разумные таймауты

---

## Отличия от PostNord (краткое резюме)

| Аспект | PostNord | Helthjem |
|--------|----------|----------|
| **Расчет стоимости** | Один endpoint | Возможно два этапа (coverage + расчет) |
| **Создание заказа** | `/api/pre-order/bookings` | `/api/parcels` |
| **ID заказа** | `bookingId` | `parcelId` |
| **Service Points** | Не используется | Возможно требуется |
| **Этикетка** | В ответе или отдельно | Возможно отдельным запросом |
| **QR код** | В ответе booking | Нужно проверить |
| **Формат адреса** | Стандартный | Объединенный адрес |
| **Авторизация** | Bearer token (простой) | OAuth2 Client Credentials |
| **Требуемые credentials** | `api_key` | `client_id` + `client_secret` |
| **Управление токенами** | Не требуется | Требуется кэширование и обновление |
| **shopId** | Не требуется | Обязательно (integer) |
| **transportSolutionId** | Не требуется | Обязательно (integer) |
| **Вес** | кг (number) | граммы (integer) |
| **Адрес** | Раздельные поля | Объединенное поле `address` |

---

## Следующие шаги

1. **Уточнить у Helthjem**:
   - Есть ли endpoint для получения цен доставки?
   - Какие `transportSolutionId` доступны для магазина?
   - Какой `shopId` использовать?

2. **Создать тестовый аккаунт Helthjem**:
   - Получить `client_id` и `client_secret`
   - Получить `shopId`
   - Протестировать endpoints в sandbox (`https://api.pre.helthjem.no`)

3. **Реализовать адаптер**:
   - Следовать плану выше
   - Особое внимание на OAuth2 авторизацию
   - Тестировать на каждом этапе

4. **Интегрировать в систему**:
   - Зарегистрировать адаптер
   - Протестировать полный flow от checkout до создания отправления

---

## Критические моменты для реализации

### 1. Отсутствие endpoint для расчета стоимости

**ПРОБЛЕМА**: В документации Helthjem нет отдельного endpoint для получения цен доставки!

**ВАРИАНТЫ РЕШЕНИЯ**:
1. Использовать фиксированные цены для разных типов посылок (если известны)
2. Рассчитывать цену на основе веса и габаритов по формуле Helthjem (если известна)
3. Уточнить у Helthjem, есть ли endpoint для получения цен
4. Показывать варианты без цены и рассчитывать при создании booking

**РЕКОМЕНДАЦИЯ**: Начать с варианта 1 или 3, но нужно уточнить у Helthjem.

### 2. OAuth2 авторизация

**ВАЖНО**: Реализовать кэширование токена с проверкой срока действия перед каждым запросом.

```typescript
private accessToken: string | null = null;
private tokenExpiresAt: Date | null = null;

private async getAccessToken(): Promise<string> {
  // Проверяем, не истек ли токен (с запасом 5 минут)
  if (this.accessToken && this.tokenExpiresAt && 
      this.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return this.accessToken;
  }

  // Получаем новый токен
  const config = await this.getConfig();
  const response = await fetch(`${config.api_base_url}/auth/oauth2/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  this.accessToken = data.token;
  this.tokenExpiresAt = new Date(Date.now() + (data.expires_in * 1000));
  
  return this.accessToken;
}
```

### 3. Формат адреса

**ВАЖНО**: Helthjem требует объединенный адрес в одном поле `address`.

```typescript
// Преобразование из формата EverShop в формат Helthjem
const helthjemAddress = {
  address: `${address.streetName} ${address.streetNumber}${address.address_2 ? ' ' + address.address_2 : ''}`,
  zipCode: address.postcode,
  postalName: address.city,
  countryCode: address.country
};
```

### 4. Вес в граммах

**ВАЖНО**: Helthjem требует вес в граммах (integer), а не в килограммах!

```typescript
// Преобразование из кг в граммы
const weightInGrams = Math.round(weight * 1000);
```

### 5. shopId и transportSolutionId

**ВАЖНО**: Эти поля обязательны для всех запросов к Helthjem API.
- `shopId` - идентификатор магазина в системе Helthjem (получается при регистрации)
- `transportSolutionId` - ID транспортного решения (может быть несколько вариантов)

### 6. Этикетка отдельным запросом

**ВАЖНО**: Этикетка получается отдельным GET запросом после создания booking.

```typescript
// После создания booking
const labelUrl = `${config.api_base_url}/parcels/v1/labels/${trackingIdentifier}/unified-large`;
// Или сохранить URL для последующего скачивания
```

### 7. Tracking identifier

**ВАЖНО**: Для отслеживания используется `tracking_identifier` из ответа booking, а не `order_id`.

---

**Примечание**: Этот план основан на актуальной документации Helthjem API (v1.0.3, OAS 3.1.0). Основные отличия от PostNord:
- OAuth2 авторизация вместо простого Bearer token
- Отсутствие endpoint для расчета стоимости (нужно уточнить)
- Объединенный формат адреса
- Вес в граммах вместо килограммов
- Обязательные поля `shopId` и `transportSolutionId`


