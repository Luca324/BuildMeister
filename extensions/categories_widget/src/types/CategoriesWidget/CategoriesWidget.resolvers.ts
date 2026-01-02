/**
 * GraphQL resolver для виджета категорий
 * 
 * Resolver обрабатывает запрос categoriesWidget(settings: JSON)
 * 
 * Зачем нужен resolver?
 * - Настройки виджета могут быть в разных форматах:
 *   * Массив чисел: [1, 2, 3]
 *   * Массив строк: ["1", "2", "3"]
 *   * Строка с запятыми: "1,2,3"
 * 
 * - Resolver нормализует все форматы в единый формат
 * - Это позволяет виджету работать с настройками независимо от формата
 * 
 * Как это работает:
 * 1. Виджет получает настройки через getWidgetSetting()
 * 2. Настройки передаются в GraphQL запрос: categoriesWidget(settings: {...})
 * 3. Resolver обрабатывает настройки и возвращает нормализованные данные
 * 4. Виджет использует эти данные для запроса реальных категорий
 * 
 * См. также:
 * - CategoriesWidget.graphql - определение GraphQL типа
 * - src/components/widgets/CategoriesWidget.tsx - использование в компоненте
 */
export default {
  Query: {
    categoriesWidget: async (root: any, { settings }: { settings?: any }) => {
      /**
       * Обрабатываем categories - может быть массивом или строкой (запятая-разделенной)
       * categories теперь содержит categoryId (number), а не uuid
       */
      let categories: number[] = [];
      if (settings?.categories) {
        if (Array.isArray(settings.categories)) {
          // Если массив - преобразуем все элементы в числа
          categories = settings.categories
            .map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id)
            .filter((id: number) => !isNaN(id));
        } else if (typeof settings.categories === 'string') {
          // Если строка - разделяем по запятым и преобразуем в числа
          categories = settings.categories
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
            .filter((id: number) => !isNaN(id));
        }
      }
      
      // Преобразуем обратно в строки для совместимости с GraphQL схемой
      return {
        categories: categories.map(id => id.toString())
      };
    }
  }
};

