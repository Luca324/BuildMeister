/**
 * Bootstrap функция - точка входа расширения
 * 
 * Эта функция вызывается EverShop при загрузке расширения.
 * Регистрирует все компоненты расширения: адаптеры провайдеров доставки и процессоры.
 * 
 * Порядок выполнения:
 * 1. Создается singleton экземпляр ShippingProviderService
 * 2. Регистрируются адаптеры провайдеров (PostNord, в будущем и Helthjem)
 * 3. Регистрируется процессор для автоматического создания отправлений после оплаты
 */

// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry';
// @ts-ignore - EverShop resolves these modules at runtime
import { hookBefore, hookAfter } from '@evershop/evershop/lib/util/hookable';
// Адаптеры провайдеров (не подключаем PostNord и Helthjem по требованию)
// import { PostNordAdapter } from './adapters/PostNordAdapter.js';
// import { HelthjemAdapter } from './adapters/HelthjemAdapter.js';
import { BringAdapter } from './adapters/BringAdapter.js';
import { ShippingProviderService } from './services/ShippingProviderService.js';
import shippingOrderProcessor from './services/ShippingOrderProcessor.js';

const debugOrderValidationRule = {
  id: 'shippingApiDebugLog',
  func: (cart: any) => {
    try {
      console.log('[SHIPPING-API] OrderValidator: состояние корзины перед createOrder', {
        cartId: cart.getData('cart_id'),
        uuid: cart.getData('uuid'),
        shipping_method: cart.getData('shipping_method'),
        shipping_address_id: cart.getData('shipping_address_id')
      });
    } catch {
      // ignore logging errors
    }
    return true;
  },
  errorMessage: 'Shipping API debug rule'
};

export default () => {
  console.log('[SHIPPING-API] Bootstrap: инициализация расширения shipping-api');
  console.log('[SHIPPING-API] Bootstrap: регистрация hookAfter(createOrderFunc) для создания отправлений');

  // Регистрируем правило валидации через процессор orderValidator (addOrderValidationRule
  // не экспортируется из пакета @evershop/evershop)
  addProcessor('orderValidator', (validatorManager: any) => {
    if (validatorManager && typeof validatorManager.add === 'function') {
      validatorManager.add(debugOrderValidationRule);
    }
    return validatorManager;
  });

  /** Страховка: если shipping_method пуст, но shipping_method_metadata содержит Bring — восстанавливаем shipping_method из настроек перед валидацией. */
  hookBefore('createOrderFunc', async (cart: any) => {
    if (cart.getData('shipping_method')) return;
    const rawMeta = cart.getData('shipping_method_metadata');
    if (!rawMeta || typeof rawMeta !== 'string') return;
    let meta: any;
    try {
      meta = JSON.parse(rawMeta);
    } catch {
      return;
    }
    if (meta?.provider !== 'bring') return;
    const { select, update } = await import('@evershop/postgres-query-builder');
    const { pool } = await import('@evershop/evershop/lib/postgres');
    const connection: any = pool;
    const setting = await select().from('setting').where('name', '=', 'shipping_api').load(connection);
    if (!setting) return;
    const configData: any = setting.is_json
      ? (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value)
      : (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value);
    const bringUuid = configData?.providers?.bring?.shipping_method_uuid;
    if (!bringUuid || typeof bringUuid !== 'string') return;
    const cartId = cart.getData('cart_id');
    if (!cartId) return;
    await update('cart')
      .given({ shipping_method: bringUuid.trim(), updated_at: new Date() })
      .where('cart_id', '=', cartId)
      .execute(connection);
    cart.setData('shipping_method', bringUuid.trim());
    console.log('[SHIPPING-API] createOrderFunc: восстановлен shipping_method из metadata', { cartId });
  }, 5);

  const shippingService = ShippingProviderService.getInstance();
  shippingService.registerAdapter(new BringAdapter());

  // Поле shipping_method_metadata должно участвовать в Cart.exportData(), чтобы при создании
  // заказа оно копировалось в order.shipping_method_metadata (план «без патча»)
  addProcessor('cartFields', (fields: any[]) => {
    return fields.concat([
      {
        key: 'shipping_method_metadata',
        resolvers: [(v: any) => v]
      }
    ]);
  }, 100);

  // Один триггер: создание отправления сразу после создания заказа (без проверки payment_status; подходит для COD и любых способов оплаты).
  hookAfter(
    'createOrderFunc',
    async (order: any, cart: any) => {
      try {
        await shippingOrderProcessor(order, { cart });
      } catch (e) {
        console.error('[SHIPPING-API] hookAfter(createOrderFunc): ошибка во время ShippingOrderProcessor', {
          orderId: order?.order_id,
          error: (e as any)?.message
        });
      }
    },
    100
  );
};

