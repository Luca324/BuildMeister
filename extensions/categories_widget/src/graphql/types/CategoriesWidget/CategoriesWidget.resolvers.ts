/**
 * GraphQL resolver для получения настроек виджета категорий
 * 
 * Используется только в компоненте настроек (CategoriesWidgetSetting.tsx)
 * для получения текущих настроек виджета из БД.
 */
export default {
  Query: {
    categoriesWidget: async (root: any, { settings }: { settings?: any }) => {
      // Просто возвращаем настройки как есть
      // Формат из БД: { categories: ["16", "17"] }
      return {
        categories: settings?.categories || []
      };
    }
  }
};

