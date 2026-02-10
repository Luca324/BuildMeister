/**
 * GraphQL resolver для обновления метода доставки в корзине
 */

export default {
  Mutation: {
    updateCartShippingMethod: async (_: any, { cartId, shippingMethod }: { cartId: string, shippingMethod: string }) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      const { pool } = await import('@evershop/postgres-query-builder/lib/pool');

      // Парсим shippingMethod
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
        .load(pool);

      if (!cart) {
        throw new Error('Cart not found');
      }

      // Обновляем метод доставки и стоимость
      await select()
        .from('cart')
        .where('cart_id', '=', cartId)
        .update({
          shipping_method: JSON.stringify(methodData),
          shipping_method_name: methodData.name || methodData.provider,
          shipping_fee_excl_tax: methodData.price || 0,
          shipping_fee_incl_tax: methodData.price || 0,
          updated_at: new Date()
        })
        .execute(pool);

      // Пересчитываем итоговую стоимость
      // @ts-ignore
      const { getConfig } = await import('@evershop/evershop/lib/util/getConfig');
      // @ts-ignore
      const { calculateCartTotal } = await import('@evershop/evershop/lib/services/calculateCartTotal');

      const updatedCart = await select()
        .from('cart')
        .where('cart_id', '=', cartId)
        .load(pool);

      // Пересчитываем итоговую стоимость корзины
      // Это должно быть сделано через стандартный механизм EverShop
      // Пока просто возвращаем обновленную корзину

      return {
        cart: updatedCart
      };
    }
  }
};

