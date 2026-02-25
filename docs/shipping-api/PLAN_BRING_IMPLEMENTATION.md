# План реализации интеграции Bring с раздельными компонентами

## Анализ текущего состояния

### Соответствие документации Bring API

#### ✅ Правильно реализовано:

1. **Shipping Guide API v2** (`/shippingguide/api/v2/products`):
   - ✅ Endpoint правильный
   - ✅ Заголовки авторизации: `X-Mybring-API-Uid`, `X-Mybring-API-Key`
   - ✅ Формат запроса: `consignments[]` с `packages[]`, `fromCountryCode`, `toCountryCode`, `fromPostalCode`, `toPostalCode`
   - ✅ Вес в граммах (`grossWeight`)
   - ✅ Габариты в см (`length`, `width`, `height`)
   - ✅ Параметры: `withPrice`, `withExpectedDelivery`, `withGuiInformation`
   - ✅ Обработка ответа: `consignments[].products[]` с фильтрацией ошибок
   - ✅ Извлечение цены: `price.netPrice` или `price.listPrice`
   - ✅ Извлечение сроков: `expectedDelivery.workingDays` или расчет из даты

2. **Booking API** (`/booking/api/create`):
   - ✅ Endpoint правильный
   - ✅ Заголовок `X-Bring-Test-Indicator` для тестового режима
   - ✅ Формат запроса: `schemaVersion: 1`, `consignments[]`
   - ✅ Структура `parties.sender` и `parties.recipient`
   - ✅ Структура `packages[]` с `weightInKg`, `dimensions`
   - ✅ Обработка ответа: `consignments[].confirmation.consignmentNumber` (tracking number)
   - ✅ Извлечение QR кода: `confirmation.packages[].qrCodeLink`
   - ✅ Извлечение этикетки: `confirmation.links.labels`

3. **Tracking API** (`/tracking/api/v2/tracking.json`):
   - ✅ Endpoint правильный
   - ✅ Параметр `q` с tracking number
   - ✅ Обработка ответа: `consignmentSet[]` с проверкой ошибок
   - ✅ Извлечение событий: `packageSet[].eventSet[]`
   - ✅ Нормализация статусов: маппинг статусов Bring → EverShop

#### ⚠️ Требует исправления:

1. **Shipping Guide API - обработка ошибок**:
   - ❌ Не обрабатываются `warnings` из ответа API
   - ❌ Не обрабатываются специфичные коды ошибок Bring (например, `OUTSIDE_COVERAGE_AREA`)
   - ✅ Нужно добавить обработку `product.errors[]` и `product.warnings[]`

2. **Booking API - формат запроса**:
   - ⚠️ `shippingDateTime` использует `new Date().toISOString()` - нужно проверить формат
   - ⚠️ `volumeInDm3` рассчитывается неправильно: должно быть `(length * width * height) / 1000`, но единицы измерения могут быть неверными
   - ⚠️ `correlationId` используется для связи с заказом - правильно
   - ⚠️ Нет обработки `additionalServices` (опционально, но может понадобиться)

3. **Address mapping**:
   - ✅ `AddressMapper.toProviderFormat()` правильно парсит `address_1` в `streetName` и `streetNumber`
   - ⚠️ Нужно проверить, что Bring принимает адрес в формате `addressLine` (объединенный) или раздельный

4. **Обработка цены**:
   - ⚠️ В `calculateShipping` используется `price.netPrice || price.listPrice` - правильно
   - ⚠️ Нужно проверить формат цены: Bring возвращает объект `DetailedPriceType` с `amountWithVAT`, `amountWithoutVAT`, `vat`
   - ❌ Текущая реализация может не извлекать цену правильно из вложенной структуры

### Соответствие плану раздельных компонентов

#### ✅ Правильно:

1. **Отдельный компонент `ShippingOptionsBlock`**:
   - ✅ Отображает варианты от API провайдеров отдельно
   - ✅ Использует GraphQL mutation `calculateShipping`
   - ✅ Использует GraphQL mutation `updateCartShippingMethod`
   - ✅ Debounce для API вызовов (700ms)
   - ✅ Обработка ошибок провайдеров

2. **Процессор создания отправления `ShippingOrderProcessor`**:
   - ✅ Вызывается после оплаты (`orderCreateAfter`)
   - ✅ Проверяет наличие `provider` в `shipping_method`
   - ✅ Создает отправление через `ShippingProviderService.createShipment()`
   - ✅ Сохраняет в `shipment` таблицу
   - ✅ Отправляет email продавцу

#### ❌ Требует удаления:

1. **Процессор `ShippingCalculationProcessor`**:
   - ❌ Пытается добавить динамические методы в стандартный список EverShop
   - ❌ Регистрируется через `addProcessor('cartCalculateShipping')`
   - ❌ Это противоречит плану раздельных компонентов
   - ❌ Нужно **полностью удалить** этот файл и его регистрацию в `bootstrap.ts`

2. **Регистрация процессора в `bootstrap.ts`**:
   - ❌ Строки 52-56: регистрация `cartCalculateShipping` процессора
   - ❌ Нужно **удалить** эти строки

---

## Детальный план реализации

### Шаг 1: Удаление неиспользуемого кода

#### 1.1. Удалить `ShippingCalculationProcessor.ts`
**Файл:** `extensions/shipping-api/src/services/ShippingCalculationProcessor.ts`

**Причина:** Этот процессор пытается добавить динамические методы в стандартный список EverShop, что противоречит плану раздельных компонентов. Варианты от API провайдеров должны отображаться только через отдельный компонент `ShippingOptionsBlock`.

**Что удалить:**
- Весь файл целиком

#### 1.2. Удалить регистрацию процессора из `bootstrap.ts`
**Файл:** `extensions/shipping-api/src/bootstrap.ts`

**Что удалить:**
- Строки 21: `import shippingCalculationProcessor from './services/ShippingCalculationProcessor.js';`
- Строки 52-56: блок регистрации `cartCalculateShipping` процессора:
  ```typescript
  addProcessor('cartCalculateShipping', async (cart: any, methods: any[], context: any) => {
    console.log('[SHIPPING-API] Bootstrap: процессор cartCalculateShipping зарегистрирован');
    return await shippingCalculationProcessor(cart, methods, context);
  }, 100);
  ```

**Что оставить:**
- Регистрацию `orderCreateAfter` процессора (строки 85-87) - это нужно для создания отправления после оплаты

---

### Шаг 2: Исправление BringAdapter

#### 2.1. Исправление извлечения цены из Shipping Guide API

**Проблема:** Bring API возвращает цену в формате:
```json
{
  "price": {
    "listPrice": {
      "priceWithAdditionalServices": {
        "amountWithVAT": "285.96",
        "amountWithoutVAT": "228.77",
        "vat": "57.19"
      }
    },
    "netPrice": {
      "priceWithAdditionalServices": {
        "amountWithVAT": "285.96",
        "amountWithoutVAT": "228.77",
        "vat": "57.19"
      }
    }
  }
}
```

**Текущая реализация (неправильно):**
```typescript
const price = priceObj.netPrice || priceObj.listPrice || priceObj.withVAT || 0;
```

**Правильная реализация:**
```typescript
// Используем netPrice если доступен, иначе listPrice
const priceObj = product.price || {};
const priceSource = priceObj.netPrice || priceObj.listPrice || {};
const priceDetails = priceSource.priceWithAdditionalServices || priceSource.priceWithoutAdditionalServices || {};
const price = parseFloat(priceDetails.amountWithVAT || priceDetails.amountWithoutVAT || '0');
const currency = priceDetails.currencyCode || priceObj.currencyCode || 'NOK';
```

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строки:** 384-389

#### 2.2. Исправление расчета объема для Booking API

**Проблема:** Текущая формула `(length * width * height) / 1000` неправильная.

**Правильная формула:**
- Габариты в см: `length * width * height` = объем в см³
- Конвертация в дм³: `(length * width * height) / 1000` (1 дм³ = 1000 см³)
- Но нужно убедиться, что все размеры в см

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строка:** 557

**Исправление:**
```typescript
volumeInDm3: Math.round((request.dimensions.length * request.dimensions.width * request.dimensions.height) / 1000)
```

#### 2.3. Исправление формата адреса для Booking API

**Проблема:** Bring Booking API требует `addressLine` (объединенный адрес), а не раздельный `streetName` и `streetNumber`.

**Согласно документации:**
```json
{
  "parties": {
    "sender": {
      "addressLine": "Industriveien 1",  // Объединенный адрес
      "addressLine2": null,
      "postalCode": "0010",
      "city": "Oslo",
      "countryCode": "NO"
    }
  }
}
```

**Текущая реализация (неправильно):**
```typescript
const senderAddressLine = `${config.from_address.streetName} ${config.from_address.streetNumber}`.trim();
const recipientAddressLine = `${request.to.streetName} ${request.to.streetNumber}`.trim();
```

**Правильная реализация:**
- Если в конфигурации `from_address` есть `addressLine`, использовать его
- Если нет, объединить `streetName` и `streetNumber`
- То же самое для `recipient`

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строки:** 502-505

#### 2.4. Добавление обработки ошибок и предупреждений

**Проблема:** Не обрабатываются `errors[]` и `warnings[]` из ответа Shipping Guide API.

**Согласно документации:**
- `product.errors[]` - массив ошибок (например, `OUTSIDE_COVERAGE_AREA`)
- `product.warnings[]` - массив предупреждений (например, `NO_PRICE_INFORMATION`)

**Что добавить:**
- Проверка `product.errors` перед добавлением в список вариантов
- Логирование `warnings` для отладки
- Обработка специфичных кодов ошибок Bring

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строки:** 360-364 (уже есть фильтрация, но нужно улучшить)

**Улучшение:**
```typescript
// Фильтруем продукты с ошибками
return consignment.products.filter((product: any) => {
  if (product.errors && Array.isArray(product.errors) && product.errors.length > 0) {
    // Логируем ошибки для отладки
    console.warn(`[SHIPPING-API] BringAdapter: продукт ${product.id} имеет ошибки:`, product.errors);
    return false;
  }
  return true;
});
```

#### 2.5. Исправление формата `shippingDateTime`

**Проблема:** `new Date().toISOString()` возвращает формат с миллисекундами и временной зоной, но нужно проверить, что Bring принимает этот формат.

**Согласно документации:**
- Формат: `"2022-06-22T12:59:30"` или `"2022-06-22T12:59:30.000+02:00"`
- `toISOString()` возвращает: `"2022-06-22T12:59:30.000Z"`

**Проверка:** Нужно протестировать, принимает ли Bring формат с `Z` (UTC). Если нет, нужно конвертировать в локальное время.

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строка:** 511

**Возможное исправление:**
```typescript
// Форматируем дату в формате, который принимает Bring
const now = new Date();
const shippingDateTime = now.toISOString().replace('Z', '+02:00'); // Или использовать локальное время
```

---

### Шаг 3: Улучшение компонента ShippingOptionsBlock

#### 3.1. Исправление `name` для radiobutton

**Проблема:** Все radiobutton используют `name="shipping-option"`, но это не гарантирует единый выбор с нативными методами EverShop.

**Решение:**
- Использовать тот же `name`, что использует нативный компонент EverShop
- Или использовать уникальный `name` только для API методов, но это создаст проблему с единым выбором

**Вариант 1 (рекомендуется):**
- Исследовать, какой `name` использует нативный компонент EverShop
- Использовать тот же `name` для API методов

**Вариант 2:**
- Использовать отдельный `name` для API методов (например, `name="api-shipping-method"`)
- Это создаст два независимых списка, но пользователь сможет выбрать только один вариант из каждого списка

**Файл:** `extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock.tsx`
**Строка:** 278

#### 3.2. Улучшение обработки выбранного варианта

**Проблема:** После выбора варианта происходит `window.location.reload()`, что не очень user-friendly.

**Решение:**
- Использовать GraphQL subscription или polling для обновления стоимости без перезагрузки
- Или использовать состояние корзины из контекста EverShop

**Файл:** `extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock.tsx`
**Строка:** 192

#### 3.3. Добавление синхронизации с выбранным методом

**Проблема:** Если пользователь выбрал метод доставки, компонент не показывает его как выбранный при повторной загрузке.

**Решение:**
- При монтировании компонента проверять `cart.shippingMethod`
- Если `shippingMethod` содержит `provider`, устанавливать `selectedOption` в соответствующий `option.id`

**Файл:** `extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock.tsx`
**Строки:** 137-142

**Добавить:**
```typescript
// Синхронизация с выбранным методом при монтировании
useEffect(() => {
  if (cart?.shippingMethod) {
    try {
      const method = typeof cart.shippingMethod === 'string' 
        ? JSON.parse(cart.shippingMethod) 
        : cart.shippingMethod;
      
      if (method.provider && method.metadata?.deliveryOptionId) {
        setSelectedOption(method.metadata.deliveryOptionId);
      }
    } catch (e) {
      // Игнорируем ошибки парсинга
    }
  }
}, [cart?.shippingMethod]);
```

---

### Шаг 4: Исправление ShippingOrderProcessor

#### 4.1. Исправление извлечения `deliveryOptionId`

**Проблема:** Используется `shippingMethod.metadata?.deliveryOptionId`, но в `ShippingOptionsBlock` сохраняется `option.id` в `metadata.deliveryOptionId`.

**Проверка:**
- В `ShippingOptionsBlock.tsx` строка 160: `deliveryOptionId: option.id`
- В `ShippingOrderProcessor.ts` строка 42: `deliveryOptionId = shippingMethod.metadata?.deliveryOptionId`

**Это правильно**, но нужно убедиться, что `option.id` в BringAdapter соответствует `productId` из Shipping Guide API.

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строка:** 413

**Проверка:**
- `option.id` должен быть равен `productId` из Shipping Guide API
- Это нужно для создания booking с правильным `product.id`

#### 4.2. Исправление использования `selectedOptionId` в Booking API

**Проблема:** В `createBooking` используется `request.selectedOptionId` как `productId`, но нужно убедиться, что это правильный ID продукта Bring.

**Согласно документации:**
- `product.id` в Booking API должен соответствовать `product.id` из Shipping Guide API
- Например: `"5600"`, `"5800"`, `"5000"` и т.д.

**Проверка:**
- В `BringAdapter.calculateShipping` строка 413: `id: productId || ...`
- `productId` извлекается из `product.id || product.productionCode`
- Это правильно, но нужно убедиться, что используется именно `product.id`, а не `productionCode`

**Файл:** `extensions/shipping-api/src/adapters/BringAdapter.ts`
**Строка:** 378

**Исправление:**
```typescript
// Product ID (код продукта Bring) - используем id, а не productionCode
const productId = product.id; // Это основной идентификатор продукта
const productionCode = product.productionCode; // Это для EDI, не для booking
```

---

### Шаг 5: Путь данных (Data Flow)

#### 5.1. Расчет стоимости доставки (Checkout)

**Поток данных:**

1. **Пользователь заполняет адрес доставки** на странице checkout
   - Данные сохраняются в `cart_address` таблицу
   - `cart.shipping_address_id` обновляется

2. **Компонент `ShippingOptionsBlock` отслеживает изменения адреса**
   - `useEffect` с зависимостями от полей адреса
   - Debounce 700ms для уменьшения количества запросов

3. **Вызов GraphQL mutation `calculateShipping`**
   - `ShippingOptionsBlock.tsx` → GraphQL mutation
   - `ShippingMutation.resolvers.ts` → `calculateShipping` resolver

4. **Resolver загружает данные из БД**
   - Загружает `cart` и `cart_address`
   - Загружает `cart_item` и `product` (для веса и габаритов)
   - Загружает конфигурацию из `setting` (адрес отправителя)

5. **Создание запроса для API**
   - `ShippingCalculationRequest` с адресами, весом, габаритами
   - Вызов `ShippingProviderService.calculateAll()`

6. **Параллельные запросы к провайдерам**
   - `ShippingProviderService` вызывает `BringAdapter.calculateShipping()`
   - `BringAdapter` формирует запрос к Shipping Guide API
   - Выполняет HTTP POST запрос к `/shippingguide/api/v2/products`

7. **Обработка ответа от Bring API**
   - Парсинг `consignments[].products[]`
   - Фильтрация продуктов с ошибками
   - Нормализация в `ShippingOption[]`

8. **Возврат результатов**
   - `ShippingProviderService` собирает результаты от всех провайдеров
   - Возвращает `ProviderResult[]` с вариантами или ошибками
   - GraphQL resolver возвращает результаты

9. **Отображение в UI**
   - `ShippingOptionsBlock` получает результаты через GraphQL
   - Отображает варианты с radiobutton
   - Показывает ошибки для недоступных провайдеров

#### 5.2. Выбор метода доставки (Checkout)

**Поток данных:**

1. **Пользователь выбирает вариант доставки**
   - Клик на radiobutton в `ShippingOptionsBlock`
   - `handleSelectOption` вызывается с выбранным `option`

2. **Формирование объекта метода доставки**
   - `shippingMethod` объект с `method_id`, `provider`, `price`, `metadata`
   - `metadata.deliveryOptionId` = `option.id` (это `productId` из Bring API)

3. **Вызов GraphQL mutation `updateCartShippingMethod`**
   - `ShippingOptionsBlock.tsx` → GraphQL mutation
   - `ShippingMutation.resolvers.ts` → `updateCartShippingMethod` resolver

4. **Сохранение в БД**
   - Resolver парсит `shippingMethod` (JSON строка или объект)
   - Обновляет `cart` таблицу:
     - `shipping_method` = JSON.stringify(methodToSave)
     - `shipping_method_name` = название метода
     - `shipping_fee_excl_tax` = стоимость без НДС
     - `shipping_fee_incl_tax` = стоимость с НДС

5. **Обновление UI**
   - `window.location.reload()` для обновления стоимости заказа
   - Или использование состояния корзины (если реализовано)

#### 5.3. Создание отправления (После оплаты)

**Поток данных:**

1. **Успешная оплата заказа**
   - EverShop создает `order` в БД
   - Статус оплаты: `payment_status = 'paid'` или `'captured'`
   - Вызывается процессор `orderCreateAfter`

2. **Процессор `ShippingOrderProcessor` проверяет условия**
   - Проверяет `payment_status` (должен быть `paid` или `captured`)
   - Проверяет `order.shipping_method` (должен быть JSON с `provider`)
   - Извлекает `providerCode` и `deliveryOptionId`

3. **Загрузка данных заказа**
   - Загружает `order_address` (адрес доставки)
   - Загружает `order_item` и `product` (для веса и габаритов)
   - Загружает конфигурацию провайдера из `setting`

4. **Создание запроса для Booking API**
   - `ShippingBookingRequest` с:
     - `selectedOptionId` = `deliveryOptionId` (это `productId` из Bring)
     - `from` = адрес отправителя из конфигурации
     - `to` = адрес получателя из заказа
     - `weight` = общий вес товаров
     - `dimensions` = максимальные габариты
     - `recipient` = данные получателя

5. **Вызов Booking API**
   - `ShippingProviderService.createShipment()` → `BringAdapter.createBooking()`
   - `BringAdapter` формирует запрос к Booking API
   - Выполняет HTTP POST запрос к `/booking/api/create`
   - Заголовок `X-Bring-Test-Indicator` для тестового режима

6. **Обработка ответа от Bring API**
   - Извлечение `consignmentNumber` (tracking number)
   - Извлечение `qrCodeLink` (QR код)
   - Извлечение `links.labels` (этикетка)

7. **Сохранение в БД**
   - Вставка или обновление записи в `shipment` таблице:
     - `carrier` = название провайдера (человекочитаемое)
     - `tracking_number` = `consignmentNumber`
     - `provider_code` = `'bring'`
     - `provider_order_id` = `consignmentNumber` (или `bookingId` если есть)
     - `qr_code_url` = `qrCodeLink`
     - `label_url` = `links.labels`
     - `metadata` = JSON с дополнительными данными

8. **Добавление записи в историю заказа**
   - Вставка в `order_activity` с комментарием о создании отправления

9. **Отправка email продавцу**
   - Если `qrCodeUrl` доступен и `sender_email` настроен
   - Email с QR кодом и инструкциями по отправке

---

### Шаг 6: Юзерфлоу

#### 6.1. Пользователь на странице checkout

1. **Заполнение адреса доставки**
   - Пользователь вводит адрес в форму EverShop
   - Данные сохраняются в `cart_address`
   - `ShippingOptionsBlock` отслеживает изменения

2. **Автоматический расчет доставки**
   - После debounce (700ms) вызывается API расчета
   - Показывается индикатор загрузки
   - Варианты доставки отображаются в отдельном блоке

3. **Отображение вариантов**
   - **Нативные методы EverShop** отображаются в стандартном списке (если есть)
   - **API методы Bring** отображаются в отдельном блоке `ShippingOptionsBlock`
   - Оба списка используют radiobutton, но с разными `name` (или одинаковыми, если найдено)

4. **Выбор метода доставки**
   - Пользователь выбирает вариант (нативный или API)
   - Если выбран API метод, он сохраняется в `cart.shipping_method` с метаданными
   - Стоимость заказа обновляется

5. **Переход к оплате**
   - Пользователь переходит к оплате
   - Метод доставки уже сохранен в корзине

#### 6.2. После оплаты

1. **Успешная оплата**
   - EverShop создает заказ
   - Статус оплаты: `paid`

2. **Автоматическое создание отправления**
   - Процессор `ShippingOrderProcessor` проверяет метод доставки
   - Если метод от API провайдера, создается отправление через Booking API
   - Получается tracking number и QR код

3. **Сохранение данных**
   - Tracking number сохраняется в `shipment` таблицу
   - Запись добавляется в историю заказа

4. **Уведомление продавца**
   - Email с QR кодом отправляется продавцу
   - Продавец может использовать QR код для отправки в отделении Bring

#### 6.3. Отслеживание отправления

1. **Пользователь или админ запрашивает статус**
   - Вызывается `BringAdapter.trackShipment(trackingNumber)`
   - Запрос к Tracking API: `/tracking/api/v2/tracking.json?q={trackingNumber}`

2. **Обработка ответа**
   - Парсинг `consignmentSet[]`
   - Извлечение событий из `packageSet[].eventSet[]`
   - Нормализация статусов

3. **Отображение статуса**
   - Текущий статус и история перемещений
   - Интеграция с системой отслеживания EverShop (если реализована)

---

### Шаг 7: Тонкости, которые нельзя упустить

#### 7.1. Формат адреса для Bring API

**Важно:**
- Shipping Guide API принимает `fromPostalCode` и `toPostalCode` (только почтовый индекс)
- Booking API требует полный адрес: `addressLine`, `postalCode`, `city`, `countryCode`
- `addressLine` должен быть объединенным адресом (улица + номер)

**Проверка:**
- `AddressMapper.toProviderFormat()` правильно парсит адрес
- Но для Booking API нужно объединить `streetName` и `streetNumber` в `addressLine`

#### 7.2. Единицы измерения

**Важно:**
- Вес: Shipping Guide API требует граммы (`grossWeight`), Booking API требует килограммы (`weightInKg`)
- Габариты: оба API используют сантиметры
- Объем: Booking API требует дм³ (`volumeInDm3`)

**Проверка:**
- В `calculateShipping`: `grossWeight: Math.round(request.weight * 1000)` - правильно
- В `createBooking`: `weightInKg: request.weight` - правильно
- В `createBooking`: `volumeInDm3` - нужно проверить формулу

#### 7.3. Обработка ошибок API

**Важно:**
- Shipping Guide API может вернуть `errors[]` для конкретного продукта
- Нужно фильтровать продукты с ошибками
- Но если все продукты имеют ошибки, нужно показать сообщение пользователю

**Проверка:**
- Текущая реализация фильтрует продукты с ошибками
- Но если все продукты отфильтрованы, возвращается пустой массив
- Компонент должен показывать сообщение "Доставка в этот адрес недоступна"

#### 7.4. Метаданные для создания booking

**Важно:**
- `selectedOptionId` в `createBooking` должен быть `productId` из Shipping Guide API
- Это не `productionCode` (который используется для EDI)
- Нужно убедиться, что `option.id` в `calculateShipping` равен `product.id`

**Проверка:**
- В `BringAdapter.calculateShipping` строка 413: `id: productId || ...`
- `productId` извлекается из `product.id || product.productionCode`
- Нужно использовать только `product.id`, не `productionCode`

#### 7.5. Тестовый режим

**Важно:**
- Booking API требует заголовок `X-Bring-Test-Indicator`
- `true` для тестового режима, `false` для продакшена
- В тестовом режиме создаются тестовые отправления, которые не отправляются реально

**Проверка:**
- В конфигурации есть `test_mode` (boolean)
- В `createBooking` используется `config.test_mode ? 'true' : 'false'`
- Нужно убедиться, что значение передается как строка, а не boolean

#### 7.6. Синхронизация состояния компонента

**Важно:**
- Если пользователь выбрал метод доставки, компонент должен показывать его как выбранный
- При изменении адреса выбранный метод должен сбрасываться (если варианты изменились)

**Проверка:**
- Текущая реализация не синхронизирует выбранный метод при монтировании
- Нужно добавить проверку `cart.shippingMethod` при монтировании

#### 7.7. Debounce для API вызовов

**Важно:**
- При изменении каждого поля адреса не нужно вызывать API
- Debounce 700ms уменьшает количество запросов
- Но нужно убедиться, что debounce работает правильно

**Проверка:**
- Текущая реализация использует `useMemo` для debounced функции
- Но `useMemo` может не работать правильно с зависимостями
- Нужно проверить, что debounce действительно работает

---

### Шаг 8: Что необходимо удалить

#### 8.1. Файлы для удаления

1. **`extensions/shipping-api/src/services/ShippingCalculationProcessor.ts`**
   - Полностью удалить файл
   - Причина: противоречит плану раздельных компонентов

#### 8.2. Код для удаления из существующих файлов

1. **`extensions/shipping-api/src/bootstrap.ts`**
   - Строка 21: `import shippingCalculationProcessor from './services/ShippingCalculationProcessor.js';`
   - Строки 52-56: блок регистрации `cartCalculateShipping` процессора
   - Комментарии, связанные с `cartCalculateShipping` процессором (строки 42-50)

#### 8.3. Код для исправления (не удаления)

1. **`extensions/shipping-api/src/adapters/BringAdapter.ts`**
   - Строки 384-389: исправить извлечение цены
   - Строка 413: убедиться, что используется `product.id`, а не `productionCode`
   - Строки 502-505: исправить формат адреса для Booking API
   - Строка 511: проверить формат `shippingDateTime`
   - Строка 557: исправить расчет `volumeInDm3`
   - Строки 360-364: улучшить обработку ошибок

2. **`extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock.tsx`**
   - Строка 192: убрать `window.location.reload()` или заменить на обновление состояния
   - Строка 278: проверить `name` для radiobutton (синхронизация с нативными методами)
   - Строки 137-142: добавить синхронизацию с выбранным методом

---

### Шаг 9: Порядок выполнения

1. **Удаление неиспользуемого кода** (Шаг 1)
   - Удалить `ShippingCalculationProcessor.ts`
   - Удалить регистрацию из `bootstrap.ts`
   - Проверить, что код компилируется

2. **Исправление BringAdapter** (Шаг 2)
   - Исправить извлечение цены
   - Исправить формат адреса для Booking API
   - Исправить расчет объема
   - Улучшить обработку ошибок

3. **Улучшение ShippingOptionsBlock** (Шаг 3)
   - Добавить синхронизацию с выбранным методом
   - Улучшить обработку выбора (убрать reload)
   - Проверить `name` для radiobutton

4. **Тестирование**
   - Тест расчета стоимости доставки
   - Тест выбора метода доставки
   - Тест создания отправления после оплаты
   - Тест обработки ошибок API

---

## Заключение

Текущая реализация в целом соответствует документации Bring API, но требует исправлений в деталях. Основная проблема - наличие `ShippingCalculationProcessor`, который противоречит плану раздельных компонентов и должен быть удален.

После исправлений система будет работать следующим образом:
- Нативные методы EverShop отображаются в стандартном списке
- API методы Bring отображаются в отдельном компоненте `ShippingOptionsBlock`
- Пользователь может выбрать только один метод (из любого списка)
- После оплаты автоматически создается отправление через Booking API
- Продавец получает QR код для отправки в отделении Bring

