# Shipping API Extension для EverShop

Расширение для интеграции с провайдерами доставки: PostNord, Helthjem.

## Установка

1. Расширение уже добавлено в `config/default.json`
2. Скомпилируйте расширение:
   ```bash
   cd extensions/shipping-api
   npm run compile
   ```
3. Выполните сборку проекта:
   ```bash
   npm run build
   ```

## Настройка

### 1. Настройка PostNord

Добавьте конфигурацию в таблицу `SETTINGS`:

```sql
INSERT INTO setting (name, value, is_json) 
VALUES (
  'shipping_api',
  '{
    "providers": {
      "postnord": {
        "enabled": true,
        "api_key": "YOUR_API_KEY",
        "api_secret": "YOUR_API_SECRET",
        "from_address": {
          "countryCode": "NO",
          "postalCode": "0001",
          "city": "Oslo",
          "streetName": "Karl Johans gate",
          "streetNumber": "1"
        },
        "sender_email": "seller@example.com",
        "api_base_url": "https://api.postnord.com"
      }
    }
  }',
  true
);
```

### 2. Настройка габаритов товаров

Габариты товаров (length_cm, width_cm, height_cm) должны быть заполнены в таблице `product` для каждого товара.

## Использование

### Интеграция компонента на странице checkout

Компонент `ShippingOptionsBlock` должен быть интегрирован на странице checkout. Есть два способа:

#### Способ 1: Переопределение стандартного компонента (рекомендуется)

Создайте файл в теме или расширении:
```
themes/tech/src/components/frontStore/checkout/ShippingMethods.jsx
```

Импортируйте и используйте компонент:
```jsx
import ShippingOptionsBlock from '@extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock';

export default function ShippingMethods({ cart }) {
  return (
    <>
      {/* Стандартный компонент EverShop */}
      {/* ... */}
      
      {/* Наш компонент с вариантами от API провайдеров */}
      <ShippingOptionsBlock cart={cart} />
    </>
  );
}
```

#### Способ 2: Добавление через Area

Если на странице checkout есть Area с подходящим areaId, компонент автоматически отобразится благодаря export layout.

### Функциональность компонента

Компонент `ShippingOptionsBlock`:
- Отслеживает изменения адреса доставки
- Вызывает API расчета доставки с debounce (700ms)
- Отображает варианты от всех активных провайдеров
- Позволяет выбрать вариант доставки
- Автоматически обновляет стоимость заказа

### После оплаты

После успешной оплаты заказа автоматически:
- Создается отправление в системе провайдера
- Сохраняется tracking number в таблице `shipment`
- Отправляется email продавцу с QR кодом

## Структура

```
extensions/shipping-api/
├── src/
│   ├── adapters/          # Адаптеры провайдеров
│   ├── services/          # Сервисы и процессоры
│   ├── mappers/           # Преобразование данных
│   ├── graphql/           # GraphQL типы и mutations
│   ├── components/        # UI компоненты
│   └── bootstrap.ts      # Точка входа
```

## Добавление новых провайдеров

1. Создайте новый адаптер, наследующий `BaseShippingAdapter`
2. Реализуйте методы: `calculateShipping()`, `createBooking()`, `trackShipment()`
3. Зарегистрируйте адаптер в `bootstrap.ts`
4. Добавьте конфигурацию в `SETTINGS`

## API Endpoints PostNord

- Расчет доставки: `POST /api/pre-order/delivery-options`
- Создание отправления: `POST /api/pre-order/bookings`
- Отслеживание: `GET /api/tracking/shipments/{trackingNumber}`

## Важные примечания

- Используется sandbox URL по умолчанию
- API ключи должны быть получены от PostNord
- Габариты товаров обязательны для расчета доставки
- Email продавцу отправляется автоматически после создания отправления

