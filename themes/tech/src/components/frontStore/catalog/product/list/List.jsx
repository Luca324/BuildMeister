import Area from '@components/common/Area';
import { Name } from '@components/frontStore/catalog/product/list/item/Name';
import { Price } from '@components/frontStore/catalog/product/list/item/Price';
import { Thumbnail } from '@components/frontStore/catalog/product/list/item/Thumbnail';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';

const normalizeSlug = (value = '') => value.replace(/^\/+|\/$/g, '');

const normalizeUrl = (value = '') => {
  if (!value) {
    return '';
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const cleaned = `/${normalizeSlug(value)}`;
  return cleaned === '//' ? '/' : cleaned;
};

const resolveProductUrl = (product = {}) => {
  const directUrl = normalizeUrl(product.url);
  if (directUrl.length > 1) {
    return directUrl;
  }

  const categoryUrl = normalizeUrl(product.category?.url);
  const urlKey = normalizeSlug(product.urlKey || product.url);

  if (categoryUrl.length > 1 && urlKey) {
    return `${categoryUrl}/${urlKey}`.replace(/\/{2,}/g, '/');
  }

  if (urlKey) {
    return normalizeUrl(urlKey);
  }

  if (product.uuid) {
    return `/product/${product.uuid}`;
  }

  return '/';
};

export default function ProductList({ products = [], countPerRow = 3 }) {
  if (products.length > 0 && products[0]?.image) {
    console.log('ProductList override rendered* - Image debug:', {
      items: products.length,
      firstProductImage: products[0].image,
      imageKeys: Object.keys(products[0].image || {}),
      listing: products[0].image?.listing,
      url: products[0].image?.url,
      origin: products[0].image?.origin,
    });
  } else {
    console.log('ProductList override rendered*', { items: products.length, firstProduct: products[0] ? { hasImage: !!products[0].image, productId: products[0].productId } : null });
  }

  const resolvedProducts = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        url: resolveProductUrl(product),
      })),
    [products]
  );

  if (resolvedProducts.length === 0) {
    return (
      <div className="product-list">
        <div className="text-center">There is no product to display</div>
      </div>
    );
  }

  let className;
  switch (countPerRow) {
    case 3:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-8';
      break;
    case 4:
      className = 'grid grid-cols-2 md:grid-cols-4 gap-8';
      break;
    case 5:
      className = 'grid grid-cols-2 md:grid-cols-5 gap-8';
      break;
    default:
      className = 'grid grid-cols-2 md:grid-cols-3 gap-8';
  }

  return (
    <div className={className}>
      {resolvedProducts.map((product) => (
        <Area
          id="productListingItem"
          className="listing-tem"
          product={product}
          key={product.productId}
          coreComponents={[
            {
              component: { default: Thumbnail },
              props: {
                url: product.url,
                imageUrl: product.image?.listing || product.image?.url || product.image?.origin,
                alt: product.name,
              },
              sortOrder: 10,
              id: 'thumbnail',
            },
            {
              component: { default: Name },
              props: { name: product.name, url: product.url, id: product.productId },
              sortOrder: 20,
              id: 'name',
            },
            {
              component: { default: Price },
              props: { ...product.price },
              sortOrder: 30,
              id: 'price',
            },
          ]}
        />
      ))}
    </div>
  );
}

ProductList.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      productId: PropTypes.number,
      uuid: PropTypes.string,
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
        url: PropTypes.string,
      }),
    })
  ),
  countPerRow: PropTypes.number,
};

ProductList.defaultProps = {
  products: [],
  countPerRow: 3,
};

