import React from 'react';
import PropTypes from 'prop-types';

interface Category {
  categoryId: number;
  uuid: string;
  name: string;
  url?: string;
  image?: {
    url?: string;
    alt?: string;
  };
}

interface CategoriesWidgetProps {
  categories?: Category[] | { items: Category[] };
  categoriesWidget?: {};
}

export default function CategoriesWidget({
  categories,
}: CategoriesWidgetProps) {
  
  // categories может быть объектом с items или массивом
  const categoriesList = Array.isArray(categories) 
    ? categories 
    : (categories?.items || []);
  
  if (!categoriesList || categoriesList.length === 0) {
    return null;
  }

  return (
    <div className="pt-7 categories__widget">
      <div className="page-width">
        <h3 className="text-center uppercase h5 tracking-widest mb-5">
        Kategorier
        </h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {categoriesList.map((category) => (
            <a
              key={category.uuid}
              href={category.url || `#category-${category.uuid}`}
              className="category-card block rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="w-full h-48 flex items-center justify-center overflow-hidden">
                {category.image?.url ? (
                  <img
                    src={category.image.url}
                    alt={category.image.alt || category.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    <svg
                      className="w-16 h-16 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-xs">No image</span>
                  </div>
                )}
              </div>
              <div className="p-3 text-center">
                <span className="font-semibold hover:text-primary line-clamp-2">
                  {category.name}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

CategoriesWidget.propTypes = {
  categories: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        categoryId: PropTypes.number,
        uuid: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string,
        image: PropTypes.shape({
          url: PropTypes.string,
          alt: PropTypes.string,
        }),
      })
    ),
    PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          categoryId: PropTypes.number,
          uuid: PropTypes.string,
          name: PropTypes.string,
          url: PropTypes.string,
        })
      ),
    }),
  ]),
  categoriesWidget: PropTypes.object,
};

CategoriesWidget.defaultProps = {
  categories: [],
  categoriesWidget: {},
};

/**
 * GraphQL запрос для получения данных виджета
 * 
 * Использует стандартный запрос Evershop categories с фильтром category_id.
 * Фильтр работает благодаря процессору registerCategoryIdFilter().
 * 
 * Формат настроек из БД: { categories: ["16", "17"] } (массив строк)
 * Процессор автоматически преобразует строки в числа для SQL запроса.
 */
export const query = `
  query Query($categoryIds: [String]) {
    categories(filters: [
      {key: "category_id", operation: in, value: $categoryIds}
    ]) {
      items {
        categoryId
        uuid
        name
        url
        image {
          url
          alt
        }
      }
    }
  }
`;

/**
 * GraphQL переменные для запроса
 * 
 * getWidgetSetting("categories", []) - получает массив ID категорий из настроек виджета
 * 
 * Как это работает:
 * 1. Администратор настраивает виджет в админ-панели (выбирает категории)
 * 2. Настройки сохраняются в таблице WIDGET.settings (JSON): { categories: ["16", "17"] }
 * 3. При рендеринге виджета getWidgetSetting("categories", []) получает этот массив
 * 4. Массив передается в GraphQL запрос как фильтр
 * 5. Процессор registerCategoryIdFilter преобразует строки в числа для SQL
 * 
 * Пример: если в БД settings = { categories: ["16", "17"] }
 * - getWidgetSetting("categories", []) → ["16", "17"]
 * - Процессор преобразует в [16, 17] для SQL запроса
 */
export const variables = `{
  categoryIds: getWidgetSetting("categories", [])
}`;
