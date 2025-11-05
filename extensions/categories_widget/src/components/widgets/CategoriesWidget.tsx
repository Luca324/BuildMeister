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
  console.log('CategoriesWidget rendered*', { categories });
  
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
          Категории
        </h3>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {categoriesList.map((category) => (
            <a
              key={category.uuid}
              href={category.url || `#category-${category.uuid}`}
              className="category-card block border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
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
                <h4 className="font-semibold text-sm hover:text-primary line-clamp-2">
                  {category.name}
                </h4>
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

export const query = `
  query Query($settings: JSON, $categoryIds: [String]) {
    categoriesWidget(settings: $settings) {
      categories
    }
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

export const variables = `{
  settings: getWidgetSetting(),
  categoryIds: getWidgetSetting("categories", [])
}`;
