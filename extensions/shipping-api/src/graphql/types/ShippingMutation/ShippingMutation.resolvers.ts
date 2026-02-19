/**
 * GraphQL resolvers для мутаций доставки
 */

import { ShippingProviderService } from '../../../services/ShippingProviderService.js';
import { toProviderFormat } from '../../../mappers/AddressMapper.js';
import {
  ShippingCalculationRequest
} from '../../../adapters/types.js';

export default {
  Mutation: {
    calculateShipping: async (_: any, { cartId }: { cartId: string }) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      // Загружаем корзину
      const cart = await select()
        .from('cart')
        .where('cart_id', '=', cartId)
        .load(connection);

      if (!cart) {
        throw new Error('Cart not found');
      }

      // Загружаем адрес доставки
      if (!cart.shipping_address_id) {
        throw new Error('Shipping address not set');
      }

      const shippingAddress = await select()
        .from('cart_address')
        .where('cart_address_id', '=', cart.shipping_address_id)
        .load(connection);

      if (!shippingAddress) {
        throw new Error('Shipping address not found');
      }

      // Загружаем товары корзины
      const cartItems = await select()
        .from('cart_item')
        .where('cart_id', '=', cartId)
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
      if (setting.is_json) {
        configData = typeof setting.value === 'string' 
          ? JSON.parse(setting.value) 
          : setting.value;
      } else {
        configData = typeof setting.value === 'string' 
          ? JSON.parse(setting.value) 
          : setting.value;
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
      const toAddress = toProviderFormat(shippingAddress);

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
          amount: parseFloat(cart.sub_total_incl_tax) || 0,
          currency: cart.currency || 'NOK'
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

      // Парсим shippingMethod
      // Может быть как строка JSON, так и объект
      let methodData: any;
      try {
        methodData = typeof shippingMethod === 'string' 
          ? JSON.parse(shippingMethod) 
          : shippingMethod;
      } catch (e) {
        throw new Error('Invalid shipping method format');
      }

      // Загружаем корзину
      const cart = await select()
        .from('cart')
        .where('cart_id', '=', cartId)
        .load(connection);

      if (!cart) {
        throw new Error('Cart not found');
      }

      // Определяем стоимость доставки
      // Может быть в разных полях: cost, costInclTax, price
      const shippingFee = methodData.costInclTax || methodData.cost || methodData.price || 0;

      // Определяем название метода
      const methodName = methodData.name || methodData.provider || 'Shipping';

      // Сохраняем полный объект метода в shipping_method для сохранения метаданных
      // Это важно для последующего создания отправления через API провайдера
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

      // Обновляем метод доставки и стоимость в корзине
      await update('cart')
        .given({
          shipping_method: JSON.stringify(methodToSave),
          shipping_method_name: methodName,
          shipping_fee_excl_tax: methodToSave.costExclTax,
          shipping_fee_incl_tax: shippingFee,
          updated_at: new Date()
        })
        .where('cart_id', '=', cartId)
        .execute(connection);

      // Загружаем обновленную корзину
      const updatedCart = await select()
        .from('cart')
        .where('cart_id', '=', cartId)
        .load(connection);

      return {
        cart: updatedCart
      };
    }
  }
};

