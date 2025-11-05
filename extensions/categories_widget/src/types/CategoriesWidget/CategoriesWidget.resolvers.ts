export default {
  Query: {
    categoriesWidget: async (root: any, { settings }: { settings?: any }) => {
      console.log('categoriesWidget resolver called*', { settings });
      
      // Обрабатываем categories - может быть массивом или строкой (запятая-разделенной)
      // categories теперь содержит categoryId (number), а не uuid
      let categories: number[] = [];
      if (settings?.categories) {
        if (Array.isArray(settings.categories)) {
          categories = settings.categories
            .map((id: string | number) => typeof id === 'string' ? parseInt(id, 10) : id)
            .filter((id: number) => !isNaN(id));
        } else if (typeof settings.categories === 'string') {
          // Разделяем строку по запятым и преобразуем в числа
          categories = settings.categories
            .split(',')
            .map((id: string) => parseInt(id.trim(), 10))
            .filter((id: number) => !isNaN(id));
        }
      }
      
      return {
        categories: categories.map(id => id.toString()) // Преобразуем обратно в строки для совместимости
      };
    }
  }
};

