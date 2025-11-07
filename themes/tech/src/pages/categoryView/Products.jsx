import ProductList from '@components/frontStore/catalog/product/list/List';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

const normalizeProducts = (items = []) =>
  items.map((item) => ({
    ...item,
    category: item.category || item.primaryCategory || null,
  }));

export default function Products({ products: { showProducts, products: { items = [] } = {} } }) {
  console.log('CategoryView.Products rendered*', { count: items.length });

  const normalizedItems = useMemo(() => normalizeProducts(items), [items]);

  if (!showProducts) {
    return null;
  }

  return (
    <div>
      <ProductList products={normalizedItems} countPerRow={3} />
      <span className="product-count italic block mt-8">
        {`${normalizedItems.length} products`}
      </span>
    </div>
  );
}

Products.propTypes = {
  products: PropTypes.shape({
    showProducts: PropTypes.number,
    products: PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          productId: PropTypes.number,
          url: PropTypes.string,
          urlKey: PropTypes.string,
          category: PropTypes.shape({
            url: PropTypes.string,
          }),
          price: PropTypes.shape({
            regular: PropTypes.shape({
              value: PropTypes.number,
              text: PropTypes.string,
            }),
            special: PropTypes.shape({
              value: PropTypes.number,
              text: PropTypes.string,
            }),
          }),
          image: PropTypes.shape({
            alt: PropTypes.string,
            listing: PropTypes.string,
          }),
        })
      ),
    }),
  }),
};

Products.defaultProps = {
  products: {
    showProducts: 1,
    products: {
      items: [],
    },
  },
};

export const layout = {
  areaId: 'rightColumn',
  sortOrder: 25,
};

export const query = `
  query Query($filters: [FilterInput]) {
    products: category(id: getContextValue('categoryId')) {
      showProducts
      products(filters: $filters) {
        items {
          ...Product
        }
      }
    }
  }`;

export const fragments = `
  fragment Product on Product {
    productId
    uuid
    name
    sku
    url
    urlKey
    category {
      url
    }
    price {
      regular {
        value
        text
      }
      special {
        value
        text
      }
    }
    image {
      alt
      url: listing
    }
  }
`;

export const variables = `
{
  filters: getContextValue('filtersFromUrl')
}`;

