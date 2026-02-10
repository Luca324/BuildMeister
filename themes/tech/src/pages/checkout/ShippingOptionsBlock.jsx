import React from 'react';
import ShippingOptionsBlock from '@extensions/shipping-api/src/components/frontStore/checkout/ShippingOptionsBlock';

export default function CheckoutShippingOptions({ cart }) {
  return <ShippingOptionsBlock cart={cart} />;
}

export const layout = {
  areaId: 'checkoutShippingAddressForm',
  sortOrder: 100
};

