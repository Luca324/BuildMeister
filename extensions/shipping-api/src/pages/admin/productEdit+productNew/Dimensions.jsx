/**
 * Компонент для редактирования габаритов товара в админ-панели
 * 
 * ЗАЧЕМ ЭТО НУЖНО:
 * - Габариты товара (длина, ширина, высота) необходимы для расчета стоимости доставки
 * - PostNord и другие провайдеры используют габариты для определения цены доставки
 * - Без габаритов невозможно точно рассчитать стоимость доставки
 * 
 * ИНТЕГРАЦИЯ С EVERSHOP:
 * - Компонент автоматически отображается на странице редактирования товара
 * - Использует систему Area: areaId='productEditGeneral', sortOrder=21
 * - Поля сохраняются в таблицу product в БД (length_cm, width_cm, height_cm)
 * 
 * ВАЛИДАЦИЯ:
 * - Все поля обязательны (validationRules={['notEmpty']})
 * - Это гарантирует, что у каждого товара будут габариты
 * - Без габаритов расчет доставки будет использовать дефолтные значения (20x15x10 см)
 * 
 * ФОРМАТ ДАННЫХ:
 * - Значения хранятся в сантиметрах (см)
 * - Поля в БД: length_cm, width_cm, height_cm (DECIMAL(10,2))
 * - GraphQL запрос использует алиасы: lengthCm, widthCm, heightCm
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Field } from '@components/common/form/Field';

function ProductDimensions({ product }) {
  const lengthCm = product?.lengthCm || '';
  const widthCm = product?.widthCm || '';
  const heightCm = product?.heightCm || '';

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      <div>
        <Field
          id="length_cm"
          name="length_cm" // Имя поля должно совпадать с именем колонки в БД
          value={lengthCm}
          placeholder="Length"
          label="Length (cm)"
          type="text"
          validationRules={['notEmpty']}
        />
      </div>
      <div>
        <Field
          id="width_cm"
          name="width_cm"
          value={widthCm}
          placeholder="Width"
          label="Width (cm)"
          type="text"
          validationRules={['notEmpty']}
        />
      </div>
      <div>
        <Field
          id="height_cm"
          name="height_cm"
          value={heightCm}
          placeholder="Height"
          label="Height (cm)"
          type="text"
          validationRules={['notEmpty']}
        />
      </div>
    </div>
  );
}

ProductDimensions.propTypes = {
  product: PropTypes.shape({
    // Значения могут быть строками (из формы) или числами (из БД/GraphQL)
    lengthCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    widthCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    heightCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })
};

ProductDimensions.defaultProps = {
  product: undefined
};

export default ProductDimensions;

/**
 * Регистрация компонента в системе Area EverShop
 * 
 * areaId: 'productEditGeneral' - область на странице редактирования товара
 * sortOrder: 21 - порядок отображения (чем меньше, тем выше)
 * 
 * Компонент автоматически появится на странице редактирования товара
 * между другими полями формы
 */
export const layout = {
  areaId: 'productEditGeneral',
  sortOrder: 21
};

/**
 * GraphQL запрос для загрузки данных габаритов товара
 * 
 * Использует алиасы для преобразования имен полей:
 * - length_cm (из БД) → lengthCm (для компонента)
 * - width_cm → widthCm
 * - height_cm → heightCm
 * 
 * getContextValue("productId", null) - получает ID товара из контекста страницы
 */
export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      lengthCm: length_cm
      widthCm: width_cm
      heightCm: height_cm
    }
  }
`;

