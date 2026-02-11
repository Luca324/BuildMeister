/**
 * GraphQL resolver для расширения типа Product полями габаритов
 * 
 * ЗАЧЕМ ЭТО НУЖНО:
 * - В БД мы добавили поля length_cm, width_cm, height_cm в таблицу product
 * - В GraphQL схеме мы расширили тип Product этими полями (Product.graphql)
 * - Но EverShop не знает, откуда брать эти данные при запросе через GraphQL
 * - Resolver говорит GraphQL: "когда запрашивают length_cm, выполни этот код"
 * 
 * ПРОБЛЕМА ПРОИЗВОДИТЕЛЬНОСТИ:
 * - Каждый resolver делает отдельный запрос к БД
 * - Если запрашивают все 3 поля, выполняется 3 запроса
 * - Это не оптимально, но работает для начала
 * 
 * ВАРИАНТЫ ОПТИМИЗАЦИИ (на будущее):
 * - Использовать DataLoader для батчинга запросов
 * - Кэшировать результаты в context
 * - Загружать все поля одним запросом, если запрашивается хотя бы одно
 * 
 * ПРИМЕЧАНИЕ:
 * - product.productId - это ID из GraphQL объекта Product
 * - Может отличаться от product_id в БД (но обычно совпадает)
 * - Используем productId, т.к. это стандартное поле GraphQL типа Product
 */

export default {
  Product: {
    /**
     * Resolver для поля length_cm (длина в сантиметрах)
     * Выполняется когда GraphQL запрашивает product.length_cm
     */
    length_cm: async (product: any, _: any, context: any) => {
      // @ts-ignore - EverShop resolves these modules at runtime
      const { select } = await import('@evershop/postgres-query-builder');
      // @ts-ignore
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();

      // Загружаем данные товара из БД по ID
      const productData = await select()
        .from('product')
        .where('product_id', '=', product.productId)
        .load(connection);

      // Возвращаем значение или null, если поле не заполнено
      return productData?.length_cm || null;
    },
    
    /**
     * Resolver для поля width_cm (ширина в сантиметрах)
     */
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
    
    /**
     * Resolver для поля height_cm (высота в сантиметрах)
     */
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

