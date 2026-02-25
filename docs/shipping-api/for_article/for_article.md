# Расширение shipping-api для EverShop: полное описание для статьи

Документ описывает расширение **shipping-api** — интеграцию внешних сервисов доставки (на примере Bring) в магазин на EverShop. Акцент на архитектуре, подводных камнях и решениях, которые вызывали баги, чтобы при повторной реализации или доработке не наступить на те же грабли.

---

## 1. Назначение расширения

- **Расчёт вариантов доставки** по адресу и корзине через API провайдера (Bring и др.) и отображение их на шаге checkout.
- **Сохранение выбранного варианта** в корзине так, чтобы ядро EverShop при создании заказа не падало с «Shipping method is required».
- **Создание отправления** (букинг) у провайдера сразу после создания заказа и запись трек-номера в БД.

Расширение не заменяет нативные методы доставки EverShop, а добавляет к ним блок с вариантами от API; при выборе такого варианта корзина и заказ должны проходить валидацию ядра без ошибок.

---

## 2. Общая архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Checkout (форма адреса + нативные методы + наш блок вариантов Bring)    │
└─────────────────────────────────────────────────────────────────────────┘
         │
         │ 1) Адрес из формы / корзины
         ▼
┌─────────────────────┐     GraphQL calculateShipping      ┌──────────────────────┐
│ ShippingOptionsBlock │ ────────────────────────────────► │ ShippingProviderService│
│ (React)               │                                   │ calculateAll()        │
└──────────────────────┘◄────────────────────────────────── └──────────────────────┘
         │              варианты от Bring (и др.)                     │
         │ 2) Выбор варианта → updateCartShippingMethod (GraphQL)     │
         │ 3) «Перейти к оплате» → наш submit: адрес + completeStep   │
         ▼
┌─────────────────────┐     POST /api/orders               ┌──────────────────────┐
│ placeOrder          │ ─────────────────────────────────► │ createOrderFunc      │
│ (cart_id в body)    │                                    │ (валидация + saveOrder)│
└─────────────────────┘                                    └──────────────────────┘
                                                                  │
                                                                  │ hookAfter('createOrderFunc')
                                                                  ▼
                                                           ┌──────────────────────┐
                                                           │ ShippingOrderProcessor│
                                                           │ → BringAdapter        │
                                                           │   .createBooking()    │
                                                           └──────────────────────┘
```

- **Фронт:** компонент `ShippingOptionsBlock` (React), встроенный в страницу checkout рядом с нативными методами доставки.
- **Расчёт вариантов:** GraphQL-мутация `calculateShipping(cartId, address)` → сервис вызывает адаптеры (Bring и др.) параллельно и возвращает варианты с ценами.
- **Сохранение метода:** GraphQL-мутация `updateCartShippingMethod(cartId, shippingMethod)` пишет в корзину UUID «фиктивного» метода и полный JSON варианта в отдельное поле.
- **Создание заказа:** ядро вызывает `createOrderFunc(cart)`. После него срабатывает наш `hookAfter('createOrderFunc')`, который вызывает `ShippingOrderProcessor` и далее Bring Booking API.

---

## 3. План «без патча»: почему два поля — shipping_method и shipping_method_metadata

В ядре EverShop валидация заказа проверяет только одно: **в корзине должно быть непустое поле `shipping_method`** (см. `orderValidator.js`: `if (!cart.getData('shipping_method')) return false`). При создании заказа в таблицу `order` попадает то, что возвращает `cart.exportData()`: в том числе `shipping_method` и, если мы его туда добавили, `shipping_method_metadata`.

Проблема: нативный поток ожидает, что `shipping_method` — это **код метода доставки** (например, строка из списка методов зоны). Для Bring у нас нет такого кода в смысле ядра: у нас есть выбранный вариант из API (product id, цена, метаданные). Если записать в `shipping_method` произвольный JSON или идентификатор варианта Bring, ядро может сломаться при отображении заказа или при проверках, ожидающих запись из таблицы `shipping_method`.

**Решение («план без патча»):**

- В **`shipping_method`** храним **UUID одной записи** из таблицы `shipping_method` — той, что создана в админке специально для Bring (один «фиктивный» метод с ценой 0, привязанный к зоне). Так валидация ядра «видит» выбранный метод, и заказ создаётся без ошибки «Shipping method is required».
- В **`shipping_method_metadata`** храним **полный JSON** выбранного варианта: `provider`, `metadata.deliveryOptionId`, цена, название и т.д. Это поле используется только нашим кодом: при создании отправления процессор читает из заказа именно `shipping_method_metadata`, парсит JSON и передаёт `deliveryOptionId` и прочее в Bring Booking API.

Важно: поле `shipping_method_metadata` по умолчанию не участвует в `cart.exportData()`. Поэтому в bootstrap мы регистрируем процессор `cartFields`, добавляющий ключ `shipping_method_metadata` с резолвером. Тогда при создании заказа `...cart.exportData()` подхватывает и это поле, и оно попадает в таблицу `order`. Без этого шага в заказе не было бы данных для букинга.

---

## 4. Настройка Bring: shipping_method_uuid

В админке EverShop нужно создать **один метод доставки** с именем «Bring» (или любым), привязать его к нужной зоне, указать цену 0 (реальная цена подставляется из выбранного варианта). После сохранения у этой записи в таблице `shipping_method` есть поле `uuid`. Этот UUID нужно прописать в настройках расширения:

В настройках приложения (таблица `setting`, имя `shipping_api`, значение — JSON) в блоке `providers.bring` должно быть поле **`shipping_method_uuid`** со значением этого UUID. Резолвер `updateCartShippingMethod` при сохранении варианта Bring подставляет в `cart.shipping_method` именно его; без `shipping_method_uuid` мутация бросает ошибку с подсказкой создать метод в админке и указать UUID.

---

## 5. Цепочка сохранения метода доставки на фронте

- Пользователь выбирает вариант Bring в блоке вариантов (radio).
- Обработчик вызывает `formContext.updateField('method', 'api_bring_<optionId>', ['notEmpty'])`, чтобы кнопка «Перейти к оплате» стала активной (ядро смотрит на наличие выбранного метода в форме).
- **Сразу при выборе** вызывается `persistShippingMethodToCart(option)`: отправляется GraphQL `updateCartShippingMethod` с полным объектом варианта (id, provider, price, metadata.deliveryOptionId и т.д.). Так мы избегаем гонки: к моменту нажатия «Перейти к оплате» метод уже записан в корзину.
- При сабмите формы (кнопка «Перейти к оплате») наш обработчик (подписан на submit с capture) делает: при необходимости повторно вызывает `persistShippingMethodToCart` (если по какой-то причине ещё не вызывали), затем сохраняет адрес через `cart.addAddressApi` (POST `/api/carts/:id/addresses`) и вызывает `completeStep('shipment', summary)`. Мы **не** даём форме уйти в нативный обработчик, который вызывает сохранение метода через REST `POST .../shippingMethods` с `method_code`: для Bring там пришёл бы код вида `api_bring_5600`, а ядро ожидает код из своей таблицы методов и могло бы перезаписать или сломать сохранённый нами метод.

Итог: сохранение метода доставки в корзине идёт **только** через нашу GraphQL-мутацию; переход к оплате мы делаем сами (адрес + completeStep), не полагаясь на нативное «сохранить метод» для нашего блока.

---

## 6. Middleware noopWhenEmptyMethod (маршрут addCartShippingMethod)

В ядре есть маршрут `POST /api/carts/:cart_id/shippingMethods` (addCartShippingMethod), который принимает `method_code` и пишет его в корзину. Чекхаут при определённых сценариях может дополнительно слать этот запрос. Для Bring мы метод уже сохранили через GraphQL, и в теле запроса может прийти пустой или не тот `method_code`. Чтобы ядро не затирало наш сохранённый метод, в расширении добавлен middleware для этого маршрута (файл в `api/addCartShippingMethod/`): если `method_code` пустой (undefined, null, ''), мы отвечаем 200 с пустым телом и **не вызываем next()**, то есть не доходим до стандартного обработчика, который бы делал `cart.setData('shipping_method', method_code)`. Так сохранённый ранее UUID и метаданные остаются в корзине.

---

## 7. Зависимости эффекта расчёта вариантов (useEffect с debouncedCalculateShipping)

В `ShippingOptionsBlock` один из эффектов вызывает расчёт вариантов доставки по полям адреса формы (до сохранения в корзину). Изначально в зависимостях эффекта были, в том числе, `formContext` и `formContext?.fields`. При выборе варианта Bring мы вызываем `formContext.updateField('method', value)` — обновляется состояние формы. Это приводило к смене ссылки на контекст или поля, эффект срабатывал заново, снова вызывался `debouncedCalculateShipping`, список вариантов перезагружался и визуально «моргал», а выбор сбрасывался или требовался второй клик.

**Исправление:** в массив зависимостей эффекта оставить только то, что реально должно запускать пересчёт — изменение **адреса**. Например: `cart?.cartId`, `debouncedCalculateShipping`, `formAddressKey` (строка, собранная из postcode, city, address_1, country). Убрать `formContext` и `formContext?.fields`. Тогда обновление только поля `method` не перезапускает эффект, и повторного запроса вариантов не происходит.

---

## 8. GraphQL: тип аргумента address в calculateShipping

В мутации `calculateShipping` изначально аргумент `address` был описан как кастомный тип `ShippingAddressInput` (input). При мерже схем расширений с ядром в некоторых сборках этот тип мог резолвиться в не-input тип (или конфликтовать с другим типом с тем же именем), из-за чего при запросе с переменной `$address: ShippingAddressInput` возникала ошибка вида «Variable "$address" expected value of type "ShippingAddressInput" which cannot be used as an input type». В результате после возврата на шаг доставки запрос расчёта падал и варианты не подгружались.

**Исправление:** передавать адрес как тип **JSON** (скаляр, уже используемый в проекте). В схеме: `calculateShipping(cartId: ID!, address: JSON)`. На фронте в запросе переменная тоже с типом `JSON`. Так мы не вводим кастомный input-тип и избегаем конфликтов при мерже схем.

---

## 9. Валидация заказа и «Shipping method is required»

Валидация выполняется в `validateBeforeCreateOrder(cart)`: вызываются правила, зарегистрированные через процессор `orderValidator`. Одно из правил ядра проверяет `cart.getData('shipping_method')`. Корзина в момент создания заказа загружается по `cart_id` из тела запроса (UUID). Если по таймингу или из-за другого запроса в корзине оказывается пустой `shipping_method` (например, ещё не успела применитьс мутация или сработал другой поток), валидация падает.

Чтобы не зависеть от гонок, добавлена **страховка** в bootstrap: `hookBefore('createOrderFunc', ...)`. В хуке проверяем: если `shipping_method` уже задан — ничего не делаем. Если пуст, но в корзине есть `shipping_method_metadata` и там JSON с `provider === 'bring'`, достаём из настроек `shipping_method_uuid`, обновляем запись корзины в БД (`shipping_method = uuid`), и вызываем `cart.setData('shipping_method', uuid)`. Так к моменту валидации корзина уже «видит» выбранный метод. Это не заменяет нормальный путь (сохранение метода при выборе и при сабмите), но страхует случай, когда по какой-то причине метод в корзине не сохранился.

---

## 10. Когда создаётся отправление: один триггер, без проверки оплаты

Изначально пробовали вешать создание отправления на процессор с именем `orderCreateAfter` через `addProcessor('orderCreateAfter', ...)`. В ядре EverShop этот идентификатор нигде не используется; ядро вызывает только хуки, навешанные на **имена функций** (через `hookable`). Создание заказа делается так: `hookable(createOrderFunc, { cart })(cart)`. Значит, наш код должен подключаться через **hookAfter('createOrderFunc', ...)** из `@evershop/evershop/lib/util/hookable`, а не через абстрактный процессор `orderCreateAfter`. Иначе процессор никогда не вызывается.

После исправления на `hookAfter('createOrderFunc', ...)` процессор вызывался, но при оплате «наличными при доставке» (COD) статус заказа остаётся `pending`, а в процессоре стояла проверка `payment_status === 'paid' || 'captured'`, и мы выходили без создания отправления. Для COD отправление нужно создавать сразу после создания заказа.

**Итоговое решение:** один триггер — только `hookAfter('createOrderFunc')`. В самом процессоре **не проверяем** `payment_status`: считаем, что раз заказ создан, можно создавать отправление. Так работают и COD, и любые другие способы оплаты. Минус: при отложенном capture (Stripe/PayPal) отправление создастся в момент создания заказа, до факта оплаты; это приемлемо, если политика магазина — создавать отправление по факту оформления заказа.

---

## 11. ShippingOrderProcessor: откуда берутся данные для букинга

Процессор вызывается с аргументом `order` — объект заказа (то, что вернул `createOrderFunc`, с полями в snake_case: `order_id`, `shipping_address_id`, `shipping_method`, `shipping_method_metadata` и т.д.). Он не проверяет оплату; парсит метод доставки:

- Сначала из `order.shipping_method_metadata` (строка JSON) — полный объект с `provider`, `metadata.deliveryOptionId` и т.д.
- Если нет — из `order.shipping_method` (на случай старого формата).

Если после парсинга нет `provider` или нет `metadata.deliveryOptionId`, процессор выходит (логирует и return). Далее проверяет `provider === 'bring'`; для других провайдеров пока только логирует и выходит. Для Bring загружает адрес доставки из `order_address`, товары из `order_item`, конфиг провайдера из `setting`, собирает вес и габариты, формирует `ShippingBookingRequest` и вызывает `ShippingProviderService.createShipment(providerCode, request)`, что в итоге дергает `BringAdapter.createBooking`. Результат (трек-номер, ссылки на этикетку и т.д.) сохраняется в таблицу `shipment` и в `order_activity`.

Важно: в заказе должны быть заполнены `shipping_method_metadata` (и при необходимости `shipping_method`). Это возможно только если при создании заказа в корзине уже были эти поля и они попали в заказ через `cart.exportData()` — отсюда необходимость регистрации `shipping_method_metadata` в `cartFields`.

---

## 12. Загрузка корзины по cartId (uuid vs cart_id)

С фронта в GraphQL часто передаётся `cartId` в виде **UUID** корзины (например, из `cart.cartId` в ответах API). В БД корзина идентифицируется и по `uuid`, и по числовому `cart_id`. В резолверах расширения корзина загружается так: сначала поиск по `uuid`, если не нашли и строка — число, то по `cart_id`. Так оба варианта идентификатора работают.

---

## 13. Порядок полей при обновлении корзины (updateCartShippingMethod)

При сохранении метода доставки обновляются поля корзины: `shipping_method`, `shipping_method_name`, `shipping_fee_incl_tax`, `grand_total` и при Bring — `shipping_method_metadata`. Пересчёт `grand_total` делается на основе текущих `sub_total_incl_tax`, `discount_amount` и стоимости доставки. Важно использовать те же поля и единицы, что и ядро, чтобы итоги в корзине и заказе совпадали.

---

## 14. Синхронизация выбранного варианта с корзиной при загрузке страницы

Если пользователь уже выбрал Bring и попал на шаг оплаты, а потом вернулся назад, корзина уже содержит `shipping_method` (UUID) и `shipping_method_metadata` (JSON). В `ShippingOptionsBlock` при монтировании срабатывает эффект, который читает `cart.shippingMethodMetadata ?? cart.shippingMethod`, парсит JSON и при наличии `provider` и `metadata.deliveryOptionId` выставляет `setSelectedOption(id)` и `setSelectedMethodData(...)`. Так визуально снова подсвечивается выбранный вариант Bring. Поле формы `method` при этом должно быть согласовано с нашим выбором (значение вида `api_bring_<id>`), иначе кнопка «Перейти к оплате» может вести себя некорректно; при выборе варианта мы обновляем и поле формы через `formContext.updateField('method', 'api_bring_'+ option.id, ['notEmpty'])`.

---

## 15. Краткий чеклист «почему расширение работает так»

- В корзине и заказе два поля: **shipping_method** (UUID фиктивного метода для валидации ядра) и **shipping_method_metadata** (полный JSON для букинга и отображения).
- **cartFields**: добавлен ключ **shipping_method_metadata**, иначе он не попадёт в `exportData()` и в заказ.
- В админке создан **один метод Bring**, его **UUID** прописан в **shipping_api.providers.bring.shipping_method_uuid**.
- Сохранение метода — **только через нашу GraphQL** `updateCartShippingMethod`; переход к оплате — через наш submit (адрес + completeStep), без нативного сохранения метода для нашего блока.
- **noopWhenEmptyMethod**: при пустом `method_code` в POST `/api/carts/.../shippingMethods` не вызываем next(), чтобы не затереть метод.
- Эффект расчёта вариантов зависит только от **адреса** (например, formAddressKey), **не** от formContext/formContext.fields, чтобы смена поля `method` не перезапускала запрос.
- **calculateShipping**: аргумент адреса — тип **JSON**, не кастомный input, чтобы не было ошибки «cannot be used as an input type» при мерже схем.
- **Страховка** в **hookBefore('createOrderFunc')**: при пустом shipping_method и наличии Bring в shipping_method_metadata подставляем UUID из настроек.
- Создание отправления — только в **hookAfter('createOrderFunc')** (из `hookable`), без проверки payment_status в процессоре, чтобы работал и COD.
- **loadCartById** в резолверах поддерживает и **uuid**, и числовой **cart_id**.

Этого достаточно, чтобы привязка сервиса доставки (Bring) работала от выбора варианта до создания отправления в одном сценарии без лишних веток и с учётом особенностей ядра EverShop.

---

## 16. Ключевые файлы расширения

| Назначение | Путь |
|------------|------|
| Регистрация хуков, cartFields, orderValidator | `extensions/shipping-api/src/bootstrap.ts` |
| Создание отправления после заказа | `extensions/shipping-api/src/services/ShippingOrderProcessor.ts` |
| Вызов адаптеров (calculate/createShipment) | `extensions/shipping-api/src/services/ShippingProviderService.ts` |
| Блок вариантов доставки на checkout | `extensions/shipping-api/src/pages/frontStore/checkout/ShippingOptionsBlock.tsx` |
| GraphQL мутации (calculateShipping, updateCartShippingMethod) | `extensions/shipping-api/src/graphql/types/ShippingMutation/` |
| Типы и поля Cart (shipping_method_metadata) | `extensions/shipping-api/src/graphql/types/Cart/` |
| Защита от перезаписи метода при пустом method_code | `extensions/shipping-api/src/api/addCartShippingMethod/[bodyParser]noopWhenEmptyMethod.js` |
| Адаптер Bring (расчёт вариантов + букинг) | `extensions/shipping-api/src/adapters/BringAdapter.ts` |
| Базовый интерфейс адаптеров | `extensions/shipping-api/src/adapters/BaseShippingAdapter.ts` |
| Преобразование адресов EverShop ↔ провайдер | `extensions/shipping-api/src/mappers/AddressMapper.ts` |

Настройка Bring (создание метода в админке и UUID в конфиге): см. [BRING_SHIPPING_METHOD_UUID.md](./BRING_SHIPPING_METHOD_UUID.md).
