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
          name="length_cm"
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
    lengthCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    widthCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    heightCm: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  })
};

ProductDimensions.defaultProps = {
  product: undefined
};

export default ProductDimensions;

export const layout = {
  areaId: 'productEditGeneral',
  sortOrder: 21
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      lengthCm: length_cm
      widthCm: width_cm
      heightCm: height_cm
    }
  }
`;

