import ProductList from '@components/frontStore/catalog/product/list/List';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

const normalizeProducts = (items = []) =>
  items.map((item) => ({
    ...item,
    category: item.category || null,
  }));

export default function CollectionProducts({ collection }) {
  console.log('CollectionProducts widget rendered*', {
    collection: collection?.name,
    count: collection?.products?.items?.length ?? 0,
  });

  if (!collection) {
    return null;
  }

  const items = collection.products?.items ?? [];
  const normalizedItems = useMemo(() => normalizeProducts(items), [items]);

  return (
    <div className="pt-12">
      <div className="page-width">
        <h3 className="mt-12 mb-12 text-center uppercase h5 tracking-widest">
          {collection.name}
        </h3>
        <ProductList products={normalizedItems} countPerRow={4} />
      </div>
    </div>
  );
}

CollectionProducts.propTypes = {
  collection: PropTypes.shape({
    collectionId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    products: PropTypes.shape({
      items: PropTypes.arrayOf(
        PropTypes.shape({
          productId: PropTypes.number.isRequired,
          uuid: PropTypes.string,
          sku: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
          url: PropTypes.string,
          urlKey: PropTypes.string,
          category: PropTypes.shape({
            url: PropTypes.string,
          }),
          price: PropTypes.shape({
            regular: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired,
            }).isRequired,
            special: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired,
            }).isRequired,
          }).isRequired,
          image: PropTypes.shape({
            alt: PropTypes.string,
            url: PropTypes.string,
          }),
        })
      ).isRequired,
    }).isRequired,
  }).isRequired,
};

export const query = `
  query Query($collection: String, $count: ID) {
    collection (code: $collection) {
      collectionId
      name
      products (filters: [{key: "limit", operation: eq, value: $count}]) {
        items {
          ...Product
        }
      }
    }
  }
`;

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
      listing
      url
      origin
    }
  }
`;

export const variables = `{
  collection: getWidgetSetting("collection"),
  count: getWidgetSetting("count")
}`;

