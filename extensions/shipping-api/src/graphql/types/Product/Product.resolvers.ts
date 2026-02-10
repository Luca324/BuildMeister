/**
 * GraphQL resolver для расширения типа Product полями габаритов
 */

export default {
  Product: {
    length_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      const { pool } = await import('@evershop/postgres-query-builder/lib/pool');

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(pool);

      return productData?.length_cm || null;
    },
    width_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      const { pool } = await import('@evershop/postgres-query-builder/lib/pool');

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(pool);

      return productData?.width_cm || null;
    },
    height_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      const { pool } = await import('@evershop/postgres-query-builder/lib/pool');

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(pool);

      return productData?.height_cm || null;
    }
  }
};

