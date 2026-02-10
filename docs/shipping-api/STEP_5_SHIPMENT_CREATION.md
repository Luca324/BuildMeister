# Шаг 5: Создание отправления после оплаты

## Цель
Автоматически создавать отправление в системе провайдера после успешной оплаты заказа, сохранять данные в БД и отправлять email продавцу с QR кодом.

---

## Архитектура создания отправления

### Принцип работы

```
Пользователь оплачивает заказ
    ↓
Payment Processor (EverShop)
    ↓
Order Creation
    ↓
ShippingOrderProcessor (наш процессор)
    ↓
Проверка условий
    ↓
ShippingProviderService.createShipment()
    ↓
PostNordAdapter.createBooking()
    ↓
PostNord API: POST /api/pre-order/bookings
    ↓
Получение trackingNumber и QR кода
    ↓
Сохранение в shipment таблицу
    ↓
Отправка email продавцу
    ↓
Обновление статуса заказа
```

---

## Точка подключения процессора

### Процессор: orderCreateAfter

**Точка подключения**: `orderCreateAfter` - процессор вызывается после создания заказа в EverShop.

**Приоритет**: 100 (высокий, чтобы выполняться после стандартных процессоров).

**Условия выполнения**:
1. Заказ успешно создан
2. Оплата успешна (`order.payment_status` = 'paid' или 'captured')
3. Выбран метод доставки с провайдером (`order.shipping_method` содержит `provider`)

---

## Логика работы процессора

### Шаг 1: Проверка условий

#### Проверка создания заказа:
- Заказ должен существовать в БД
- `order.order_id` должен быть валидным

#### Проверка оплаты:
```typescript
const paymentStatus = order.payment_status;
const isPaid = paymentStatus === 'paid' || paymentStatus === 'captured';
if (!isPaid) {
  // Пропустить создание отправления, оплата еще не завершена
  return;
}
```

**Важные примечания**:
- Некоторые платежные системы могут создавать заказ до оплаты
- Нужно проверять статус оплаты перед созданием отправления
- Если оплата еще не завершена - процессор должен пропустить выполнение

#### Проверка метода доставки:
```typescript
const shippingMethod = order.shipping_method;
if (!shippingMethod || !shippingMethod.provider) {
  // Обычный метод доставки, не требует создания отправления через API
  return;
}
```

**Важные примечания**:
- Если метод доставки не содержит `provider` - это обычный метод EverShop
- Для таких методов отправление создается вручную админом
- Процессор должен работать только для методов с провайдерами

---

### Шаг 2: Извлечение данных

#### Получение кода провайдера:
```typescript
const providerCode = order.shipping_method.provider; // 'postnord', 'helthjem', 'bring'
```

#### Получение deliveryOptionId:
```typescript
const deliveryOptionId = order.shipping_method.metadata?.deliveryOptionId;
if (!deliveryOptionId) {
  throw new Error('deliveryOptionId not found in shipping method metadata');
}
```

**Важные примечания**:
- `deliveryOptionId` необходим для создания отправления в PostNord
- Если его нет - это ошибка конфигурации, нужно логировать и уведомлять админа

#### Загрузка адреса доставки:
```typescript
// Загрузить order_address где тип = shipping
const shippingAddress = await loadOrderAddress(order.shipping_address_id);
```

**Структура адреса**:
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

#### Загрузка товаров заказа:
```typescript
const orderItems = await loadOrderItems(order.order_id);
```

**Структура товара**:
```typescript
{
  product_id: 123,
  product_name: "Product Name",
  qty: 2,
  product_weight: 1.5, // кг
  // Габариты нужно загрузить из products таблицы
}
```

---

### Шаг 3: Подготовка данных для API

#### Преобразование адреса получателя:
```typescript
import { AddressMapper } from '../mappers/AddressMapper';

const recipientAddress = AddressMapper.toProviderFormat(shippingAddress, 'postnord');
```

**Результат**:
```typescript
{
  countryCode: "NO",
  postalCode: "0165",
  city: "Oslo",
  streetName: "Karl Johans gate",
  streetNumber: "1"
}
```

#### Получение адреса отправителя:
```typescript
// Из конфигурации провайдера в SETTINGS
const providerConfig = await getProviderConfig(providerCode);
const senderAddress = providerConfig.from_address;
```

#### Расчет веса и габаритов:
```typescript
// Общий вес (сумма всех товаров)
let totalWeight = 0;
for (const item of orderItems) {
  totalWeight += item.product_weight * item.qty;
}

// Общие габариты (максимум по сторонам)
let maxLength = 0;
let maxWidth = 0;
let maxHeight = 0;

for (const item of orderItems) {
  // Загрузить габариты из products
  const product = await loadProduct(item.product_id);
  maxLength = Math.max(maxLength, product.length_cm);
  maxWidth = Math.max(maxWidth, product.width_cm);
  maxHeight = Math.max(maxHeight, product.height_cm);
}
```

**Важные примечания**:
- Габариты рассчитываются как максимум по сторонам (не сумма объемов)
- Это упрощенный подход, но достаточный для большинства случаев
- Если товары упаковываются вместе - используются максимальные габариты

#### Подготовка данных получателя:
```typescript
const recipient = {
  name: shippingAddress.full_name,
  phone: shippingAddress.telephone,
  email: order.customer_email || shippingAddress.email // если есть
};
```

#### Подготовка объявленной стоимости:
```typescript
const declaredValue = {
  amount: order.sub_total_incl_tax, // или grand_total, в зависимости от требований
  currency: order.currency || 'NOK'
};
```

---

### Шаг 4: Создание отправления через API

#### Вызов ShippingProviderService:
```typescript
import { ShippingProviderService } from '../services/ShippingProviderService';

const bookingRequest = {
  selectedOptionId: deliveryOptionId,
  orderId: order.order_id.toString(),
  orderNumber: order.order_number,
  from: senderAddress,
  to: recipientAddress,
  recipient: recipient,
  weight: totalWeight,
  dimensions: {
    length: maxLength,
    width: maxWidth,
    height: maxHeight
  },
  declaredValue: declaredValue
};

const result = await ShippingProviderService.createShipment(providerCode, bookingRequest);
```

**Результат**:
```typescript
{
  trackingNumber: "3729384739",
  bookingId: "booking_123",
  qrCodeUrl: "https://api.postnord.com/qr/...",
  labelUrl: "https://api.postnord.com/label/...",
  metadata: {
    // дополнительные данные
  }
}
```

**Обработка ошибок**:
- Если API недоступен - логировать ошибку, НЕ блокировать создание заказа
- Если неверные данные - логировать ошибку с деталями
- Если дублирование заказа - проверить, не создано ли уже отправление

---

### Шаг 5: Сохранение в БД

#### Создание записи в shipment:
```typescript
// Получить человекочитаемое название провайдера
const providerName = ShippingProviderService.getProviderName(providerCode); // "PostNord"

const shipmentData = {
  shipment_order_id: order.order_id,
  carrier: providerName, // 'PostNord' - человекочитаемое название для отображения
  tracking_number: result.trackingNumber,
  provider_code: providerCode, // 'postnord' - код для программной обработки
  provider_order_id: result.bookingId,
  qr_code_url: result.qrCodeUrl,
  label_url: result.labelUrl,
  metadata: JSON.stringify(result.metadata)
};

await createShipment(shipmentData);
```

**SQL запрос**:
```sql
INSERT INTO shipment (
  uuid,
  shipment_order_id,
  carrier,
  tracking_number,
  provider_code,
  provider_order_id,
  qr_code_url,
  label_url,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  $1, -- order_id
  $2, -- providerName (например, 'PostNord')
  $3, -- trackingNumber
  $4, -- providerCode (например, 'postnord')
  $5, -- bookingId
  $6, -- qrCodeUrl
  $7, -- labelUrl
  $8, -- metadata (JSON)
  $8, -- metadata JSON
  NOW(),
  NOW()
);
```

**Важные примечания**:
- Использовать транзакцию для атомарности операции
- Проверять, не создано ли уже отправление для этого заказа
- Если отправление уже существует - обновить его, а не создавать новое

---

### Шаг 6: Отправка email продавцу

#### Получение email продавца:
```typescript
const sellerEmail = providerConfig.sender_email;
if (!sellerEmail) {
  // Логировать предупреждение, но не блокировать процесс
  logger.warn('Seller email not configured for provider', { providerCode });
  return;
}
```

#### Подготовка email:
```typescript
const emailData = {
  to: sellerEmail,
  subject: `Новый заказ #${order.order_number} - требуется отправка`,
  template: 'shipping/new-shipment', // или использовать HTML напрямую
  data: {
    orderNumber: order.order_number,
    orderId: order.order_id,
    trackingNumber: result.trackingNumber,
    qrCodeUrl: result.qrCodeUrl,
    recipientAddress: shippingAddress,
    recipientName: shippingAddress.full_name,
    recipientPhone: shippingAddress.telephone,
    items: orderItems.map(item => ({
      name: item.product_name,
      qty: item.qty,
      sku: item.product_sku
    })),
    instructions: `
      Для отправки товара:
      1. Упакуйте товар согласно заказу
      2. Перейдите в ближайшее отделение PostNord
      3. Покажите QR код сотруднику отделения
      4. Сотрудник отсканирует QR код и примет посылку
    `
  }
};
```

#### Отправка email:
```typescript
import { sendEmail } from '@evershop/evershop/lib/util/email';

await sendEmail(emailData);
```

**Важные примечания**:
- Использовать существующую систему отправки email в EverShop
- Если отправка email не удалась - логировать ошибку, но не блокировать процесс
- Email должен содержать QR код как изображение или ссылку
- Инструкции должны быть понятными на языке продавца

---

### Шаг 7: Обновление статуса заказа

#### Обновление shipment_status:
```typescript
await updateOrder(order.order_id, {
  shipment_status: 'processing' // или другой подходящий статус
});
```

#### Добавление записи в order_activity:
```typescript
await createOrderActivity({
  order_activity_order_id: order.order_id,
  comment: `Отправление создано в ${providerCode}. Трек-номер: ${result.trackingNumber}`,
  customer_notified: false
});
```

**Важные примечания**:
- Статус должен соответствовать конфигурации EverShop (`config/default.json`)
- Запись в `order_activity` помогает отслеживать историю заказа
- Админ может видеть, когда было создано отправление

---

## Обработка ошибок

### Сценарий 1: API недоступен

**Действия**:
1. Логировать ошибку с деталями
2. Создать запись в `order_activity` с предупреждением
3. НЕ блокировать создание заказа (заказ уже создан и оплачен)
4. Отправить уведомление админу о необходимости создать отправление вручную

**Код**:
```typescript
try {
  const result = await ShippingProviderService.createShipment(...);
  // успешное создание
} catch (error) {
  if (error instanceof ShippingProviderUnavailableError) {
    logger.error('Shipping provider unavailable', { providerCode, orderId: order.order_id });
    await createOrderActivity({
      order_activity_order_id: order.order_id,
      comment: `Ошибка создания отправления в ${providerCode}. Требуется ручное создание.`,
      customer_notified: false
    });
    // Уведомить админа
    await notifyAdmin('Shipping creation failed', { orderId: order.order_id, error: error.message });
  }
}
```

### Сценарий 2: Неверные данные

**Действия**:
1. Логировать ошибку с деталями
2. Создать запись в `order_activity` с описанием проблемы
3. НЕ блокировать создание заказа
4. Уведомить админа

### Сценарий 3: Дублирование заказа

**Действия**:
1. Проверить, существует ли уже отправление для этого заказа
2. Если существует - обновить его данными
3. Если не существует - создать новое

**Код**:
```typescript
const existingShipment = await findShipmentByOrderId(order.order_id);
if (existingShipment) {
  // Обновить существующее отправление
  await updateShipment(existingShipment.shipment_id, {
    tracking_number: result.trackingNumber,
    qr_code_url: result.qrCodeUrl,
    // ...
  });
} else {
  // Создать новое отправление
  await createShipment(shipmentData);
}
```

---

## Транзакции и атомарность

### Использование транзакций:

Все операции с БД должны выполняться в транзакции:

```typescript
await db.transaction(async (trx) => {
  // 1. Создать отправление
  const shipment = await createShipment(shipmentData, trx);
  
  // 2. Обновить статус заказа
  await updateOrder(order.order_id, { shipment_status: 'processing' }, trx);
  
  // 3. Создать запись в order_activity
  await createOrderActivity({ ... }, trx);
  
  // Если все успешно - транзакция коммитится
  // Если ошибка - транзакция откатывается
});
```

**Важные примечания**:
- Транзакция гарантирует атомарность операций
- Если создание отправления не удалось - не обновлять статус заказа
- Email отправляется после успешного сохранения в БД

---

## Логирование

### Что логировать:

1. **Начало процесса**:
   ```typescript
   logger.info('Creating shipment for order', { orderId: order.order_id, providerCode });
   ```

2. **Успешное создание**:
   ```typescript
   logger.info('Shipment created successfully', { 
     orderId: order.order_id, 
     trackingNumber: result.trackingNumber,
     providerCode 
   });
   ```

3. **Ошибки**:
   ```typescript
   logger.error('Failed to create shipment', { 
     orderId: order.order_id, 
     providerCode, 
     error: error.message,
     stack: error.stack 
   });
   ```

4. **Детали запроса к API**:
   ```typescript
   logger.debug('API request', { providerCode, requestData });
   logger.debug('API response', { providerCode, responseData });
   ```

---

## Тестирование

### Что нужно протестировать:

1. **Успешное создание отправления**:
   - Все данные корректно сохраняются в БД
   - Email отправляется продавцу
   - Статус заказа обновляется

2. **Ошибка API**:
   - Заказ не блокируется
   - Ошибка логируется
   - Админ уведомляется

3. **Дублирование**:
   - Проверка существующего отправления
   - Обновление вместо создания нового

4. **Транзакции**:
   - Откат при ошибке
   - Атомарность операций

---

## Следующие шаги

После реализации создания отправления:
1. Протестировать полный flow от checkout до создания отправления
2. Проверить отправку email продавцу
3. Интегрировать с существующей системой отслеживания
4. Добавить поддержку других провайдеров (Helthjem, Bring)

