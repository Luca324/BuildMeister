# Шаг 3: Интеграция с EverShop

## Цель
Интегрировать адаптеры доставки в систему EverShop через процессоры, GraphQL API и сервисы.

---

## Архитектура интеграции

### Принцип работы

```
Frontend (Checkout)
    ↓ GraphQL Mutation: calculateShipping
    ↓
GraphQL Resolver
    ↓
ShippingProviderService
    ↓
PostNordAdapter / HelthjemAdapter / BringAdapter
    ↓
PostNord API / Helthjem API / Bring API
    ↓
Ответ → Нормализация → Возврат в Frontend
```

```
Order Creation (после оплаты)
    ↓
EverShop Order Processor
    ↓
ShippingOrderProcessor (наш процессор)
    ↓
ShippingProviderService.createShipment()
    ↓
PostNordAdapter.createBooking()
    ↓
Сохранение в shipment таблицу
    ↓
Email продавцу с QR кодом
```

---

## Структура файлов

```
extensions/shipping-api/src/
├── services/
│   ├── ShippingProviderService.ts        # Менеджер всех провайдеров
│   ├── ShippingCalculationProcessor.ts  # Процессор расчета стоимости
│   └── ShippingOrderProcessor.ts         # Процессор создания отправления
├── graphql/
│   ├── types/
│   │   └── ShippingOption/
│   │       ├── ShippingOption.graphql
│   │       └── ShippingOption.resolvers.ts
│   └── mutations/
│       ├── CalculateShipping.graphql
│       └── CalculateShipping.resolvers.ts
└── bootstrap.ts                          # Регистрация всех компонентов
```

---

## ShippingProviderService - Менеджер провайдеров

### Назначение

Центральный сервис для управления всеми адаптерами доставки. Регистрирует адаптеры, выбирает активные, выполняет параллельные запросы.

### Логика работы:

1. **Регистрация адаптеров**:
   - При инициализации расширения регистрируются все доступные адаптеры
   - Адаптеры регистрируются через метод `registerAdapter(adapter)`
   - Каждый адаптер имеет уникальный код (`postnord`, `helthjem`, `bring`)

2. **Получение активных провайдеров**:
   - Читает конфигурацию из `SETTINGS` таблицы
   - Фильтрует только включенные (`enabled: true`) провайдеры
   - Возвращает список активных адаптеров

3. **Параллельный расчет стоимости** (`calculateAll()`):
   - Принимает запрос на расчет доставки
   - Получает список активных провайдеров
   - Вызывает `calculateShipping()` для каждого адаптера параллельно (Promise.all)
   - Обрабатывает ошибки: если один провайдер недоступен, остальные продолжают работать
   - Возвращает массив результатов с указанием провайдера и вариантов (или ошибки)

4. **Создание отправления** (`createShipment()`):
   - Принимает код провайдера и данные заказа
   - Находит соответствующий адаптер
   - Вызывает `createBooking()` у адаптера
   - Возвращает результат создания отправления

### Формат возвращаемых данных:

```typescript
// calculateAll() возвращает:
[
  {
    provider: "postnord",
    options: [
      { id: "...", name: "PostNord Standard", price: 199, ... },
      { id: "...", name: "PostNord Express", price: 399, ... }
    ],
    error: null
  },
  {
    provider: "helthjem",
    options: [],
    error: "Service temporarily unavailable"
  }
]

// createShipment() возвращает:
{
  trackingNumber: "3729384739",
  bookingId: "booking_123",
  qrCodeUrl: "https://...",
  labelUrl: "https://...",
  metadata: {...}
}
```

### Важные примечания:

- **Параллельные запросы**: Используем `Promise.allSettled()` вместо `Promise.all()`, чтобы один провайдер не блокировал остальные
- **Таймауты**: Устанавливаем таймаут для каждого запроса (например, 10 секунд)
- **Обработка ошибок**: Ошибки одного провайдера не должны влиять на другие
- **Кэширование**: НЕ используем кэширование (по требованию пользователя)

---

## GraphQL интеграция

### Тип ShippingOption

#### GraphQL схема:

```graphql
type ShippingOption {
  id: String!
  name: String!
  price: Float!
  currency: String!
  estimatedDays: Int
  serviceCode: String
  provider: String!
  metadata: JSON
}
```

#### Resolver:

- Простой возврат данных, без дополнительной логики
- Данные уже нормализованы адаптером

### Mutation: calculateShipping

#### GraphQL схема:

```graphql
extend type Mutation {
  calculateShipping(
    cartId: ID!
  ): [ShippingProviderOptions!]!
}

type ShippingProviderOptions {
  provider: String!
  providerName: String!
  options: [ShippingOption!]!
  error: String
}
```

#### Логика работы Resolver:

1. **Получение данных корзины**:
   - Загрузить `cart` по `cartId`
   - Загрузить `cart_address` (адрес доставки)
   - Загрузить `cart_item` (товары в корзине)

2. **Подготовка запроса**:
   - Преобразовать адрес получателя через `AddressMapper`
   - Получить адрес отправителя из конфигурации
   - Рассчитать общий вес корзины (сумма `product_weight * qty`)
   - Рассчитать общие габариты (максимум по сторонам всех товаров)

3. **Вызов ShippingProviderService**:
   - Вызвать `calculateAll()` с подготовленными данными
   - Получить результаты от всех активных провайдеров

4. **Формирование ответа**:
   - Преобразовать результаты в формат GraphQL
   - Включить информацию о провайдере и ошибках (если есть)

#### Важные примечания:

- **Валидация**: Проверять, что корзина существует и содержит товары
- **Валидация адреса**: Проверять, что адрес доставки заполнен полностью
- **Обработка ошибок**: Возвращать ошибки GraphQL с понятными сообщениями
- **Производительность**: Запросы к БД должны быть оптимизированы (один запрос с JOIN)

---

## Процессоры EverShop

### Процессор 1: ShippingCalculationProcessor

#### Назначение:

Перехватывает расчет стоимости доставки в корзине и заменяет статический расчет на динамический через API провайдеров.

#### Точка подключения:

`cartCalculateShipping` - процессор вызывается при расчете стоимости доставки для корзины.

#### Логика работы:

1. **Проверка условий**:
   - Проверить, заполнен ли адрес доставки в корзине
   - Проверить, есть ли товары в корзине
   - Если условий нет - пропустить обработку (использовать стандартный расчет)

2. **Проверка метода доставки**:
   - Проверить, выбран ли метод доставки с провайдером (`cart.shipping_method` содержит `provider`)
   - Если метод с провайдером - использовать API расчет
   - Если обычный метод - использовать стандартный расчет EverShop

3. **Вызов API расчета**:
   - Подготовить данные для расчета (адреса, вес, габариты)
   - Вызвать `ShippingProviderService.calculateAll()`
   - Получить варианты от всех провайдеров

4. **Обновление корзины**:
   - Если пользователь уже выбрал вариант - обновить `cart.shipping_fee_excl_tax` и `cart.shipping_fee_incl_tax`
   - Если не выбрал - оставить как есть (варианты будут показаны в UI)

#### Важные примечания:

- **Приоритет**: Установить высокий приоритет (например, 100), чтобы наш процессор выполнялся после стандартных
- **Не блокировать стандартные методы**: Если провайдеры недоступны, должен работать стандартный расчет
- **Кэширование**: НЕ использовать кэширование

---

### Процессор 2: ShippingOrderProcessor

#### Назначение:

Создает отправление в системе провайдера после успешного создания заказа и оплаты.

#### Точка подключения:

`orderCreateAfter` - процессор вызывается после создания заказа.

#### Логика работы:

1. **Проверка условий**:
   - Проверить, что заказ успешно создан
   - Проверить, что оплата успешна (`order.payment_status` = 'paid' или 'captured')
   - Проверить, что выбран метод доставки с провайдером (`order.shipping_method` содержит `provider`)

2. **Извлечение данных**:
   - Получить код провайдера из `order.shipping_method.provider`
   - Получить `deliveryOptionId` из `order.shipping_method.metadata.deliveryOptionId`
   - Загрузить адрес доставки (`order_address` где тип = shipping)
   - Загрузить товары заказа (`order_item`)

3. **Подготовка запроса**:
   - Преобразовать адрес получателя через `AddressMapper`
   - Получить адрес отправителя из конфигурации
   - Рассчитать вес и габариты заказа
   - Подготовить данные получателя (имя, телефон, email)

4. **Создание отправления**:
   - Вызвать `ShippingProviderService.createShipment(providerCode, bookingRequest)`
   - Получить результат: `trackingNumber`, `qrCodeUrl`, `labelUrl`

5. **Сохранение в БД**:
   - Создать запись в таблице `shipment`:
     ```sql
     INSERT INTO shipment (
       shipment_order_id,
       carrier_name,
       tracking_number,
       provider_code,
       provider_order_id,
       qr_code_url,
       label_url,
       metadata
     ) VALUES (...)
     ```

6. **Отправка email продавцу**:
   - Если есть `qrCodeUrl` - отправить email продавцу с QR кодом
   - Email должен содержать:
     - Номер заказа
     - Адрес получателя
     - QR код (изображение или ссылка)
     - Инструкции по использованию QR кода

7. **Обновление статуса заказа**:
   - Обновить `order.shipment_status` = 'processing' (если нужно)
   - Добавить запись в `order_activity` о создании отправления

#### Обработка ошибок:

- **Ошибка создания отправления**:
  - Логировать ошибку
  - НЕ блокировать создание заказа (заказ уже создан)
  - Сохранить ошибку в `order_activity` для админа
  - Отправить уведомление админу о необходимости создать отправление вручную

- **Повторная попытка**:
  - Можно добавить механизм повторных попыток (опционально)
  - Или оставить создание отправления вручную через админку

#### Важные примечания:

- **Асинхронность**: Процессор должен быть асинхронным
- **Транзакции**: Создание отправления должно быть в транзакции с сохранением в БД
- **Email**: Использовать существующую систему отправки email в EverShop
- **Логирование**: Все действия должны логироваться

---

## Bootstrap - Регистрация компонентов

### Логика инициализации:

1. **Импорт адаптеров**:
   ```typescript
   import PostNordAdapter from './adapters/PostNordAdapter';
   // import HelthjemAdapter from './adapters/HelthjemAdapter'; // будущее
   // import BringAdapter from './adapters/BringAdapter'; // будущее
   ```

2. **Создание экземпляра ShippingProviderService**:
   ```typescript
   const shippingService = new ShippingProviderService();
   ```

3. **Регистрация адаптеров**:
   ```typescript
   shippingService.registerAdapter(new PostNordAdapter());
   // shippingService.registerAdapter(new HelthjemAdapter()); // будущее
   // shippingService.registerAdapter(new BringAdapter()); // будущее
   ```

4. **Регистрация процессоров**:
   ```typescript
   import { addProcessor } from '@evershop/evershop/lib/util/registry';
   import ShippingCalculationProcessor from './services/ShippingCalculationProcessor';
   import ShippingOrderProcessor from './services/ShippingOrderProcessor';
   
   addProcessor('cartCalculateShipping', ShippingCalculationProcessor, 100);
   addProcessor('orderCreateAfter', ShippingOrderProcessor, 100);
   ```

5. **Регистрация GraphQL типов и mutations**:
   - EverShop автоматически найдет файлы в `src/graphql/`
   - Нужно только убедиться, что файлы находятся в правильных местах

### Важные примечания:

- **Порядок регистрации**: Сначала адаптеры, потом процессоры
- **Глобальный доступ**: ShippingProviderService должен быть доступен глобально (через singleton или dependency injection)
- **Конфигурация**: Проверять наличие конфигурации при инициализации

---

## Хранение метаданных метода доставки

### В корзине (cart.shipping_method):

```json
{
  "method_id": "123",
  "provider": "postnord",
  "option_id": "delivery_option_id_from_postnord",
  "price": 199,
  "metadata": {
    "deliveryOptionId": "delivery_option_id_from_postnord",
    "serviceCode": "SERVICE_123",
    "estimatedDays": 5
  }
}
```

### В заказе (order.shipping_method):

Аналогичный формат, копируется из корзины при создании заказа.

### Важные примечания:

- **Совместимость**: Если `shipping_method` не содержит `provider`, используется стандартный расчет EverShop
- **Валидация**: При сохранении проверять наличие обязательных полей
- **Миграция**: Старые методы доставки без `provider` продолжают работать

---

## Обработка ошибок на уровне интеграции

### Сценарии ошибок:

1. **Все провайдеры недоступны**:
   - Возвращать пустой массив вариантов
   - Показывать сообщение в UI (обрабатывается на фронтенде)

2. **Один провайдер недоступен**:
   - Возвращать варианты от остальных провайдеров
   - Включать информацию об ошибке в ответ

3. **Ошибка при создании отправления**:
   - Логировать ошибку
   - Сохранять в `order_activity`
   - НЕ блокировать создание заказа

4. **Неверный адрес**:
   - Возвращать пустой массив вариантов
   - Показывать сообщение пользователю

---

## Тестирование интеграции

### Что нужно протестировать:

1. **GraphQL Mutation calculateShipping**:
   - Успешный расчет с несколькими провайдерами
   - Ошибка при отсутствии адреса
   - Ошибка при пустой корзине
   - Все провайдеры недоступны

2. **Процессор расчета стоимости**:
   - Перехват расчета для метода с провайдером
   - Пропуск стандартного расчета для обычных методов

3. **Процессор создания отправления**:
   - Успешное создание отправления
   - Ошибка при создании (не блокирует заказ)
   - Отправка email продавцу

4. **Сохранение метаданных**:
   - Корректное сохранение в корзине
   - Корректное копирование в заказ

---

## Следующие шаги

После реализации интеграции:
1. Перейти к Шагу 4: Создание UI компонентов
2. Реализовать компонент выбора вариантов доставки
3. Интегрировать с существующей формой checkout


