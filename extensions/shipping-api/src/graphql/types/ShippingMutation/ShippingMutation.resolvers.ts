/**
 * GraphQL resolvers для мутаций доставки
 */

import { ShippingProviderService } from '../../../services/ShippingProviderService.js';

/** Преобразует ключи объекта из snake_case в camelCase для совместимости со схемой Cart */
function snakeToCamel(obj: Record<string, unknown> | null): Record<string, unknown> {
  if (obj == null || typeof obj !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out;
}

type CartRow = Record<string, unknown> & {
  cart_id: number;
  uuid?: string;
  sub_total_incl_tax?: number | string;
  discount_amount?: number | string;
  currency?: string;
};

/** Загружает корзину по cartId: с фронта может приходить uuid или числовой cart_id */
async function loadCartById(connection: any, cartId: string): Promise<CartRow | null> {
  const { select } = await import('@evershop/postgres-query-builder');
  let cart = await select().from('cart').where('uuid', '=', cartId).load(connection);
  if (!cart && /^\d+$/.test(String(cartId))) {
    cart = await select().from('cart').where('cart_id', '=', cartId).load(connection);
  }
  return cart as CartRow | null;
}

import { toProviderFormat, type EverShopAddress } from '../../../mappers/AddressMapper.js';
import {
  ShippingCalculationRequest
} from '../../../adapters/types.js';

export default {
  Mutation: {
    calculateShipping: async (_: any, { cartId, address: addressInput }: { cartId: string; address?: any }) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      const connection: any = pool || await getConnection();

      const cart = await loadCartById(connection, cartId);
      if (!cart) {
        throw new Error('Cart not found');
      }

      let shippingAddress: Record<string, unknown>;

      if (addressInput && addressInput.postcode && addressInput.city && addressInput.address1 && addressInput.country) {
        // Адрес передан из формы (ещё не сохранён в корзину)
        shippingAddress = {
          full_name: addressInput.fullName || '',
          postcode: addressInput.postcode,
          telephone: addressInput.telephone || '',
          city: addressInput.city,
          address_1: addressInput.address1,
          address_2: null,
          country: addressInput.country,
          province: addressInput.province || null
        };
      } else {
        if (!cart.shipping_address_id) {
          throw new Error('Shipping address not set');
        }
        const loaded = await select()
          .from('cart_address')
          .where('cart_address_id', '=', cart.shipping_address_id)
          .load(connection);
        if (!loaded) {
          throw new Error('Shipping address not found');
        }
        shippingAddress = loaded as Record<string, unknown>;
      }

      // Загружаем товары корзины (используем cart_id из загруженной корзины)
      const cartItems = await select()
        .from('cart_item')
        .where('cart_id', '=', cart.cart_id)
        .execute(connection);

      if (!cartItems || cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Получаем адрес отправителя из конфигурации
      const setting = await select()
        .from('setting')
        .where('name', '=', 'shipping_api')
        .load(connection);

      if (!setting) {
        throw new Error('Shipping API configuration not found');
      }

      let configData: any;
      try {
        if (setting.is_json) {
          configData = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        } else {
          configData = typeof setting.value === 'string' 
            ? JSON.parse(setting.value) 
            : setting.value;
        }
      } catch (parseError: any) {
        console.error('[SHIPPING-API] Error parsing shipping_api config:', parseError);
        console.error('[SHIPPING-API] Setting value:', setting.value);
        throw new Error(`Invalid shipping API configuration format: ${parseError.message}`);
      }

      // Используем адрес отправителя из первого активного провайдера
      // В будущем можно сделать выбор провайдера или несколько адресов
      const providers = configData?.providers || {};
      const firstProvider = Object.values(providers).find((p: any) => p.enabled);
      
      if (!firstProvider) {
        throw new Error('No active shipping providers configured');
      }

      const fromAddress = (firstProvider as any).from_address;
      if (!fromAddress) {
        throw new Error('Sender address not configured');
      }

      // Преобразуем адрес получателя
      const toAddress = toProviderFormat(shippingAddress as unknown as EverShopAddress);

      // Рассчитываем общий вес и габариты
      let totalWeight = 0;
      let maxLength = 0;
      let maxWidth = 0;
      let maxHeight = 0;

      for (const item of cartItems) {
        totalWeight += (parseFloat(item.product_weight) || 0) * parseInt(item.qty);

        // Загружаем габариты товара
        const product = await select()
          .from('product')
          .where('product_id', '=', item.product_id)
          .load(connection);

        if (product) {
          maxLength = Math.max(maxLength, parseFloat(product.length_cm) || 0);
          maxWidth = Math.max(maxWidth, parseFloat(product.width_cm) || 0);
          maxHeight = Math.max(maxHeight, parseFloat(product.height_cm) || 0);
        }
      }

      // Подготавливаем запрос для расчета
      const calculationRequest: ShippingCalculationRequest = {
        from: fromAddress,
        to: toAddress,
        weight: totalWeight,
        dimensions: {
          length: maxLength || 20, // Дефолтные значения, если товары не имеют габаритов
          width: maxWidth || 15,
          height: maxHeight || 10
        },
        declaredValue: {
          amount: Number(cart.sub_total_incl_tax) || 0,
          currency: (cart.currency as string) || 'NOK'
        }
      };

      // Вызываем сервис для расчета
      const service = ShippingProviderService.getInstance();
      const results = await service.calculateAll(calculationRequest);

      return results;
    },
    
    updateCartShippingMethod: async (_: any, { cartId, shippingMethod }: { cartId: string, shippingMethod: string }) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select, update } = await import('@evershop/postgres-query-builder');
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      let methodData: any;
      try {
        methodData = typeof shippingMethod === 'string' 
          ? JSON.parse(shippingMethod) 
          : shippingMethod;
      } catch (e) {
        console.error('[SHIPPING-API] updateCartShippingMethod: неверный формат shippingMethod', { cartId });
        throw new Error('Invalid shipping method format');
      }

      console.log('[SHIPPING-API] updateCartShippingMethod: вход', {
        cartId,
        provider: methodData?.provider ?? null,
        hasMetadata: !!(methodData?.metadata && Object.keys(methodData.metadata).length)
      });

      const cart = await loadCartById(connection, cartId);
      if (!cart) {
        console.error('[SHIPPING-API] updateCartShippingMethod: корзина не найдена', { cartId });
        throw new Error('Cart not found');
      }

      const shippingFee = methodData.costInclTax || methodData.cost || methodData.price || 0;
      const methodName = methodData.name || methodData.provider || 'Shipping';

      const methodToSave = {
        id: methodData.id || methodData.method_id,
        name: methodName,
        cost: shippingFee,
        costExclTax: methodData.costExclTax || shippingFee,
        costInclTax: shippingFee,
        price: shippingFee,
        provider: methodData.provider,
        metadata: methodData.metadata || {}
      };

      let cartShippingMethodValue: string;
      let shippingMethodMetadataValue: string | null = null;

      if (methodData.provider === 'bring') {
        // План «без патча»: в shipping_method — UUID записи из таблицы shipping_method (фиктивный метод Bring),
        // в shipping_method_metadata — полный JSON для букинга
        const setting = await select()
          .from('setting')
          .where('name', '=', 'shipping_api')
          .load(connection);
        if (!setting) throw new Error('Shipping API configuration not found');
        const configData: any = setting.is_json
          ? (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value)
          : (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value);
        const bringUuid = configData?.providers?.bring?.shipping_method_uuid;
        if (!bringUuid || typeof bringUuid !== 'string') {
          console.error('[SHIPPING-API] updateCartShippingMethod: в настройках shipping_api.providers.bring не задан shipping_method_uuid');
          throw new Error(
            'Bring: в настройках доставки не задан shipping_method_uuid. ' +
            'Создайте в админке один метод доставки «Bring», привяжите к зоне, и укажите его UUID в настройках расширения.'
          );
        }
        cartShippingMethodValue = bringUuid.trim();
        shippingMethodMetadataValue = JSON.stringify(methodToSave);
      } else {
        cartShippingMethodValue = JSON.stringify(methodToSave);
      }

      const subTotalInclTax = Number(cart.sub_total_incl_tax ?? 0);
      const discountAmount = Number(cart.discount_amount ?? 0);
      const newGrandTotal = subTotalInclTax + Number(shippingFee) - discountAmount;

      const updatePayload: Record<string, any> = {
        shipping_method: cartShippingMethodValue,
        shipping_method_name: methodName,
        shipping_fee_excl_tax: methodToSave.costExclTax,
        shipping_fee_incl_tax: shippingFee,
        grand_total: newGrandTotal,
        updated_at: new Date()
      };
      if (shippingMethodMetadataValue !== null) {
        updatePayload.shipping_method_metadata = shippingMethodMetadataValue;
      }

      await update('cart')
        .given(updatePayload)
        .where('cart_id', '=', cart.cart_id)
        .execute(connection);

      // Загружаем обновлённую корзину и возвращаем в формате Cart (camelCase),
      // чтобы резолверы Price (grandTotal, shippingFeeInclTax и т.д.) получали числа
      const updatedRow = await select()
        .from('cart')
        .where('cart_id', '=', cart.cart_id)
        .load(connection);

      console.log('[SHIPPING-API] updateCartShippingMethod: после обновления cart', {
        cartId,
        dbCartId: updatedRow?.cart_id ?? null,
        uuid: updatedRow?.uuid ?? null,
        shipping_method: updatedRow?.shipping_method ?? null,
        shipping_method_metadata: updatedRow?.shipping_method_metadata ?? null,
        shipping_fee_incl_tax: updatedRow?.shipping_fee_incl_tax ?? null,
        grand_total: updatedRow?.grand_total ?? null
      });

      const cartForGraphQL = snakeToCamel(updatedRow) as Record<string, unknown>;
      console.log('[SHIPPING-API] updateCartShippingMethod: успех', {
        cartId,
        methodName: methodToSave.name,
        provider: methodToSave.provider ?? null
      });
      return {
        cart: cartForGraphQL
      };
    }
  }
};

