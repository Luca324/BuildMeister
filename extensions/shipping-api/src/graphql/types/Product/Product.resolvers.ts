/**
 * GraphQL resolver для расширения типа Product полями габаритов
 */

export default {
  Product: {
    length_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(connection);

      return productData?.length_cm || null;
    },
    width_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(connection);

      return productData?.width_cm || null;
    },
    height_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(connection);

      return productData?.height_cm || null;
    }
  }
};

