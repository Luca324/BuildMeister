# План: логи Bring Booking и фикс перезагрузки вариантов

## Проблема 1: в ЛК Bring отправления не появляются

Добавить логирование, чтобы понять: вызывается ли процессор после оплаты и что возвращает Bring.

### 1.1 ShippingOrderProcessor

- При выходе по «оплата не завершена» логировать: `[SHIPPING-API] ShippingOrderProcessor: пропуск — оплата не завершена`, `orderId`, `paymentStatus` (значение `order.payment_status`).
- Так будет видно, срабатывает ли процессор и не выходим ли мы по `!isPaid`.

### 1.2 BringAdapter.createBooking

- Сразу после `makeRequest('/booking/api/create', ...)` логировать **полный ответ** Bring: `console.log('[SHIPPING-API] BringAdapter.createBooking: ответ API', JSON.stringify(response, null, 2))` (или без чувствительных данных).
- По логам будет ясно, создаётся ли отправление или Bring возвращает ошибку/пустой confirmation.

---

## Проблема 2: перезагрузка вариантов при выборе Bring (корень причины)

**Причина:** Эффект, который вызывает расчёт вариантов доставки (`debouncedCalculateShipping`), в зависимостях имеет `formContext` и `formContext?.fields`. При клике на вариант Bring вызывается `formContext.updateField('method', value)` — обновляется поле формы. Контекст формы (или ссылка на `fields`) меняется, эффект перезапускается, снова вызывается `debouncedCalculateShipping` → варианты перезапрашиваются и список «перезагружается»; выбор визуально сбрасывается или требуется второй клик.

**Решение:** Запускать эффект расчёта только при изменении **адреса**, а не при любом изменении формы (в т.ч. поля `method`).

### 2.1 Изменить зависимости эффекта расчёта по форме

В [ShippingOptionsBlock.tsx](extensions/shipping-api/src/pages/frontStore/checkout/ShippingOptionsBlock.tsx) эффект (строки ~231–252):

- **Убрать** из массива зависимостей: `formContext`, `formContext?.fields`.
- **Оставить**: `cart?.cartId`, `debouncedCalculateShipping`, `formAddressKey`.

Тогда эффект будет срабатывать только при смене `cartId` или ключа адреса (`formAddressKey`). Обновление поля `method` не меняет `formAddressKey`, эффект не перезапустится, повторного запроса к Bring не будет.

- Внутри эффекта по-прежнему проверять `if (!formContext) return` и использовать `getForm(...)` — значения полей адреса берутся из текущего рендера (`formPostcode`, `formCity` и т.д. уже в замыкании). При первом появлении адреса (когда пользователь заполняет поля) `formAddressKey` изменится и эффект выполнится. Этого достаточно.
- Если когда-то понадобится реагировать на первое появление `formContext` (форма смонтировалась), можно добавить в deps только стабильный флаг вроде `!!formContext`, но не сам объект `formContext` или `formContext?.fields`, чтобы смена только `method` не триггерила эффект.

---

## Порядок действий

1. **ShippingOrderProcessor**: лог при `if (!isPaid) return` с `orderId`, `paymentStatus`.
2. **BringAdapter.createBooking**: после успешного `makeRequest` логировать полный ответ Bring (JSON).
3. **ShippingOptionsBlock**: в эффекте расчёта по форме убрать из зависимостей `formContext` и `formContext?.fields`, оставить `cart?.cartId`, `debouncedCalculateShipping`, `formAddressKey`.

После этого по логам будет ясно, доходим ли до вызова Bring и что он возвращает; перезагрузка вариантов при выборе метода должна исчезнуть.
