import React from 'react';
import PropTypes from 'prop-types';
// @ts-ignore - EverShop resolves @components at runtime
import CategorySelector from '@components/admin/promotion/couponEdit/CategorySelector';
// @ts-ignore - EverShop resolves @components at runtime
import { useModal } from '@components/common/modal/useModal';
// @ts-ignore - EverShop resolves @components at runtime
import { useQuery } from 'urql';

const CategoryQuery = `
  query Query ($id: Int!) {
    category(id: $id) {
      name
      path {
        name
      }
    }
  }
`;

function SelectedCategory({ categoryId, onRemove }: { categoryId: number; onRemove: () => void }) {
  const [result] = useQuery({
    query: CategoryQuery,
    variables: {
      id: categoryId
    }
  });
  const { data, fetching, error } = result;
  
  if (error) {
    return <p className="text-critical">Error loading category</p>;
  }
  if (fetching) {
    return <span>Loading...</span>;
  }
  
  return (
    <div className="border rounded border-[#c9cccf] mb-4 p-4 flex justify-between items-center">
      <div>
        {data?.category?.path?.map((item: { name: string }, index: number) => (
          <span key={item.name} className="text-gray-500">
            {item.name}
            {index < (data.category.path.length - 1) && ' > '}
          </span>
        ))}
      </div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="text-critical ml-8"
      >
        Remove
      </a>
    </div>
  );
}

export default function CategoriesWidgetSetting({
  categoriesWidget: { categories = [] },
}: {
  categoriesWidget: { categories?: string[] | string };
}) {
  const initialCategories: number[] = Array.isArray(categories) 
    ? categories.map((c: string | number) => typeof c === 'string' ? parseInt(c, 10) : c).filter((id: number) => !isNaN(id))
    : (typeof categories === 'string' ? categories.split(',').map((c: string) => parseInt(c.trim(), 10)).filter((id: number) => !isNaN(id)) : []);

  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<number[]>(initialCategories);
  const modal = useModal();

  const closeModal = () => {
    modal.closeModal();
  };

  const onSelect = (categoryId: number) => {
    if (!selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds(prev => [...prev, categoryId]);
    }
    // Не закрываем модальное окно, чтобы пользователь мог выбрать несколько категорий
  };

  const onUnSelect = (categoryId: number) => {
    setSelectedCategoryIds(prev => prev.filter(id => id !== categoryId));
  };

  const onRemove = (categoryId: number) => {
    setSelectedCategoryIds(prev => prev.filter(id => id !== categoryId));
  };

  return (
    <div>
      <div className="mb-4">Velg kategorier som skal vises</div>
      {selectedCategoryIds.length > 0 && (
        <div className="mb-4">
          {selectedCategoryIds.map((categoryId) => (
            <SelectedCategory
              key={categoryId}
              categoryId={categoryId}
              onRemove={() => onRemove(categoryId)}
            />
          ))}
        </div>
      )}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          modal.openModal();
        }}
        className="text-interactive"
      >
        Select category
      </a>
      {modal.state.showing && (
        <div className={modal.className} onAnimationEnd={modal.onAnimationEnd}>
          <div className="modal-wrapper flex self-center justify-center items-center" tabIndex={-1} role="dialog">
            <div className="modal">
              <CategorySelector
                onSelect={onSelect}
                onUnSelect={onUnSelect}
                selectedIDs={selectedCategoryIds}
                closeModal={closeModal}
              />
            </div>
          </div>
        </div>
      )}
      {selectedCategoryIds.map((categoryId, index) => (
        <input
          key={categoryId}
          type="hidden"
          name={`settings[categories][${index}]`}
          value={categoryId}
        />
      ))}
    </div>
  );
}

CategoriesWidgetSetting.propTypes = {
  categoriesWidget: PropTypes.shape({
    categories: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      PropTypes.string,
    ]),
  }),
};

CategoriesWidgetSetting.defaultProps = {
  categoriesWidget: {
    categories: [],
  },
};

/**
 * GraphQL запрос для компонента настроек виджета
 * 
 * Этот запрос используется в админ-панели для отображения текущих настроек виджета.
 * 
 * categoriesWidget(settings: $settings) - кастомный GraphQL запрос
 * - Получает настройки виджета через getWidgetSetting()
 * - Resolver обрабатывает настройки и возвращает нормализованные данные
 * - Используется для отображения выбранных категорий в форме настроек
 * 
 * См. также:
 * - src/types/CategoriesWidget/CategoriesWidget.graphql - определение типа
 * - src/types/CategoriesWidget/CategoriesWidget.resolvers.ts - обработка запроса
 */
export const query = `
  query Query($settings: JSON) {
    categoriesWidget(settings: $settings) {
      categories
    }
  }
`;

/**
 * GraphQL переменные
 * 
 * getWidgetSetting() - получает настройки виджета из БД
 * В компоненте настроек это текущие сохраненные настройки виджета
 */
export const variables = `{
  settings: getWidgetSetting()
}`;
