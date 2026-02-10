# Шаг 2: Создание базового адаптера и PostNordAdapter

## Цель
Создать абстрактный базовый класс для всех провайдеров доставки и реализовать PostNordAdapter с реальными API вызовами.

---

## Архитектура адаптеров

### Принцип работы

1. **BaseShippingAdapter** - абстрактный класс, определяющий интерфейс для всех провайдеров
2. **PostNordAdapter** - конкретная реализация для PostNord API
3. Все адаптеры реализуют единый интерфейс, что позволяет легко добавлять новых провайдеров

### Движение данных

```
EverShop Cart/Order
    ↓
ShippingProviderService
    ↓
BaseShippingAdapter (интерфейс)
    ↓
PostNordAdapter (реализация)
    ↓
PostNord API
    ↓
Ответ от API
    ↓
Нормализация данных
    ↓
Возврат в EverShop формат
```

---

## Структура файлов

```
extensions/shipping-api/src/
├── adapters/
│   ├── BaseShippingAdapter.ts          # Абстрактный класс
│   ├── PostNordAdapter.ts             # Реализация PostNord
│   └── types.ts                        # TypeScript типы и интерфейсы
```

---

## BaseShippingAdapter - Интерфейс и контракт

### Методы, которые должны быть реализованы:

1. **getProviderCode()**: string
   - Возвращает уникальный код провайдера (`postnord`, `helthjem`, `bring`)
   - Используется для идентификации провайдера в БД и настройках

2. **getProviderName()**: string
   - Возвращает человекочитаемое название (`PostNord`, `Helthjem`, `Bring`)
   - Используется в UI

3. **calculateShipping(request)**: Promise<ShippingOption[]>
   - Расчет стоимости доставки
   - Принимает: адреса от/до, вес, габариты, объявленная стоимость
   - Возвращает: массив вариантов доставки с ценами

4. **createBooking(request)**: Promise<ShippingBookingResult>
   - Создание отправления в системе провайдера
   - Принимает: данные заказа, выбранный вариант доставки, данные получателя
   - Возвращает: tracking_number, booking_id, QR код (если есть)

5. **trackShipment(trackingNumber)**: Promise<TrackingInfo>
   - Отслеживание статуса отправления
   - Принимает: tracking_number
   - Возвращает: текущий статус и историю

### Важные примечания:

- Все методы должны быть асинхронными (async/await)
- Все методы должны выбрасывать понятные ошибки при неудаче
- Ошибки должны содержать информацию для логирования и отображения пользователю

---

## PostNordAdapter - Реализация

### Конфигурация

Конфигурация хранится в `SETTINGS` таблице:
```json
{
  "shipping_api": {
    "providers": {
      "postnord": {
        "enabled": true,
        "api_key": "...",
        "api_secret": "...",
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
  }
}
```

### Метод 1: calculateShipping()

#### Логика работы:

1. **Получение конфигурации** из SETTINGS
2. **Подготовка запроса** к PostNord API:
   - Преобразование адреса получателя из формата EverShop в формат PostNord
   - Расчет общих габаритов посылки (максимум по сторонам всех товаров)
   - Подготовка веса (уже в кг в EverShop)
3. **Вызов API**: `POST /api/pre-order/delivery-options`
   - Endpoint: `https://api.postnord.com/api/pre-order/delivery-options`
   - Headers: Authorization с API ключом
   - Body: JSON с параметрами расчета
4. **Обработка ответа**:
   - Проверка наличия `deliveryOptions` в ответе
   - Если пусто - адрес недоступен, возвращаем пустой массив
   - Если есть варианты - нормализуем каждый вариант
5. **Нормализация данных**:
   - Преобразование каждого варианта в формат `ShippingOption`
   - Извлечение цены, названия, сроков доставки
   - Сохранение `deliveryOptionId` в metadata для последующего использования

#### Формат запроса к PostNord:

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

#### Формат ответа (нормализованный):

```typescript
[
  {
    id: "delivery_option_id_123",
    name: "PostNord Standard",
    price: 199,
    currency: "NOK",
    estimatedDays: 5,
    serviceCode: "SERVICE_123",
    metadata: {
      deliveryOptionId: "delivery_option_id_123",
      // другие данные от PostNord
    }
  }
]
```

#### Обработка ошибок:

- **API недоступен**: выбрасываем ошибку `ShippingProviderUnavailableError`
- **Неверный адрес**: возвращаем пустой массив (адрес недоступен)
- **Неверные параметры**: выбрасываем ошибку с описанием проблемы
- **Таймаут**: выбрасываем ошибку `ShippingProviderTimeoutError`

---

### Метод 2: createBooking()

#### Логика работы:

1. **Получение конфигурации** из SETTINGS
2. **Подготовка запроса** к PostNord Booking API:
   - Использование `deliveryOptionId` из выбранного варианта доставки
   - Преобразование адресов в формат PostNord
   - Подготовка данных получателя (имя, телефон, email)
   - Подготовка данных отправителя из конфигурации
3. **Вызов API**: `POST /api/pre-order/bookings`
   - Endpoint: `https://api.postnord.com/api/pre-order/bookings`
   - Headers: Authorization с API ключом
   - Body: JSON с данными заказа
4. **Обработка ответа**:
   - Извлечение `trackingNumber` из ответа
   - Извлечение `bookingId` (если есть)
   - Извлечение QR кода (если есть в ответе)
   - Извлечение URL этикетки (если есть)
5. **Возврат результата**:
   - Формирование объекта `ShippingBookingResult`
   - Сохранение всех необходимых данных для последующего сохранения в БД

#### Формат запроса к PostNord:

```json
{
  "deliveryOptionId": "delivery_option_id_123",
  "from": {
    "countryCode": "NO",
    "postalCode": "0001",
    "city": "Oslo",
    "streetName": "Karl Johans gate",
    "streetNumber": "1"
  },
  "to": {
    "countryCode": "NO",
    "postalCode": "0165",
    "city": "Oslo",
    "streetName": "...",
    "streetNumber": "..."
  },
  "recipient": {
    "name": "John Doe",
    "phone": "+4712345678",
    "email": "customer@example.com"
  },
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

#### Формат ответа (нормализованный):

```typescript
{
  trackingNumber: "3729384739",
  bookingId: "booking_123",
  qrCodeUrl: "https://api.postnord.com/qr/...",
  labelUrl: "https://api.postnord.com/label/...",
  metadata: {
    // дополнительные данные от PostNord
  }
}
```

#### Обработка ошибок:

- **API недоступен**: выбрасываем ошибку `ShippingProviderUnavailableError`
- **Неверные данные**: выбрасываем ошибку с описанием проблемы
- **Дублирование заказа**: проверяем, не создан ли уже заказ с таким orderId
- **Таймаут**: выбрасываем ошибку `ShippingProviderTimeoutError`

---

### Метод 3: trackShipment()

#### Логика работы:

1. **Вызов API**: `GET /api/tracking/shipments/{trackingNumber}`
   - Endpoint: `https://api.postnord.com/api/tracking/shipments/{trackingNumber}`
   - Headers: Authorization с API ключом
2. **Обработка ответа**:
   - Извлечение текущего статуса
   - Извлечение истории статусов
   - Нормализация в формат EverShop
3. **Возврат результата**:
   - Текущий статус (pending, processing, shipped, delivered, canceled)
   - История изменений статуса
   - Дополнительная информация (местоположение, даты и т.д.)

#### Важные примечания:

- Этот метод уже может быть частично реализован в существующей системе отслеживания
- Нужно проверить, как сейчас работает отслеживание, и интегрировать PostNord в существующий механизм
- Если есть расширение `order_status_display`, нужно добавить поддержку PostNord

---

## AddressMapper - Преобразование адресов

### Логика преобразования

EverShop формат (`cart_address` / `order_address`):
```typescript
{
  full_name: "John Doe",
  postcode: "0165",
  telephone: "+4712345678",
  country: "NO",
  province: "Oslo",
  city: "Oslo",
  address_1: "Karl Johans gate 1",
  address_2: "Apartment 5"
}
```

PostNord формат:
```typescript
{
  countryCode: "NO",
  postalCode: "0165",
  city: "Oslo",
  streetName: "Karl Johans gate",
  streetNumber: "1"
}
```

### Алгоритм парсинга address_1:

1. Попытка извлечь номер дома через regex: `/^(.+?)\s+(\d+.*)$/`
2. Если совпадение найдено:
   - `streetName` = первая группа (название улицы)
   - `streetNumber` = вторая группа (номер дома)
3. Если совпадение не найдено:
   - `streetName` = весь `address_1`
   - `streetNumber` = пустая строка (или можно попробовать извлечь из `address_2`)

### Важные примечания:

- Нужно обрабатывать различные форматы адресов
- Норвежские адреса обычно имеют формат "Улица Номер"
- Если адрес не парсится корректно, нужно логировать предупреждение
- В случае ошибки парсинга можно попробовать использовать весь `address_1` как `streetName`

---

## Обработка ошибок и логирование

### Типы ошибок:

1. **ShippingProviderUnavailableError** - провайдер временно недоступен
2. **ShippingProviderTimeoutError** - таймаут запроса
3. **ShippingAddressInvalidError** - неверный адрес
4. **ShippingBookingError** - ошибка при создании отправления
5. **ShippingTrackingError** - ошибка при отслеживании

### Логирование:

- Все запросы к API должны логироваться
- Все ошибки должны логироваться с контекстом
- Успешные ответы можно логировать на уровне DEBUG
- Использовать структурированное логирование для удобства анализа

---

## Тестирование

### Что нужно протестировать:

1. **calculateShipping()**:
   - Успешный расчет с несколькими вариантами
   - Пустой ответ (адрес недоступен)
   - Ошибка API
   - Таймаут

2. **createBooking()**:
   - Успешное создание отправления
   - Ошибка при неверных данных
   - Дублирование заказа

3. **trackShipment()**:
   - Успешное получение статуса
   - Неверный tracking_number
   - Ошибка API

4. **AddressMapper**:
   - Различные форматы адресов
   - Адреса без номера дома
   - Адреса с дополнительной информацией в address_2

---

## Следующие шаги

После реализации адаптера:
1. Перейти к Шагу 3: Интеграция с EverShop
2. Создать ShippingProviderService для управления адаптерами
3. Зарегистрировать процессоры EverShop


