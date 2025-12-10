// @ts-ignore - EverShop resolves these modules at runtime
import ProductNoThumbnail from '@components/common/ProductNoThumbnail';
// @ts-ignore - EverShop resolves these modules at runtime
import Badge from '@components/common/Badge';
import PropTypes from 'prop-types';
import React from 'react';
// @ts-ignore - EverShop resolves these modules at runtime
// @ts-ignore - Function signature may differ in runtime
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface OrderWithStatusesProps {
  order: {
    orderId: string;
    orderNumber: string;
    createdAt: {
      text: string;
    };
    grandTotal: {
      text: string;
    };
    items: Array<{
      productSku: string;
      productName: string;
      thumbnail?: string;
      productPrice: {
        text: string;
      };
      qty: number;
    }>;
    shipmentStatus?: {
      name: string;
      code: string;
      badge: string;
      progress?: string;
    };
    paymentStatus?: {
      name: string;
      code: string;
      badge: string;
      progress?: string;
    };
  };
}

export default function OrderWithStatuses({ order }: OrderWithStatusesProps) {
  const { shipmentStatus, paymentStatus } = order;

  // Map status codes to progress values
  const getProgress = (statusCode: string, statusType: 'shipment' | 'payment'): string => {
    if (statusType === 'shipment') {
      if (statusCode === 'delivered') return 'complete';
      if (statusCode === 'pending') return 'incomplete';
      if (statusCode === 'canceled' || statusCode === 'cancelled') return 'incomplete';
      return 'incomplete';
    } else {
      if (statusCode === 'paid') return 'complete';
      if (statusCode === 'pending') return 'incomplete';
      if (statusCode === 'canceled' || statusCode === 'cancelled') return 'incomplete';
      return 'incomplete';
    }
  };

  return (
    <div className="order border-divider">
      <div className="order-inner grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column - Order items */}
        <div className="order-items col-span-1">
          {order.items.map((item) => (
            <div className="order-item mb-4 flex gap-8 items-center" key={item.productSku}>
              <div className="thumbnail border border-divider p-4 rounded">
                {item.thumbnail ? (
                  <img style={{ maxWidth: '6rem' }} src={item.thumbnail} alt={item.productName} />
                ) : (
                  <ProductNoThumbnail width={100} height={100} />
                )}
              </div>
              <div className="order-item-info">
                <div className="order-item-name font-semibold">{item.productName}</div>
                <div className="order-item-sku italic">
                  {/* @ts-ignore - Function signature differs in runtime */}
                  {_('Sku')}: #{item.productSku}
                </div>
                <div className="order-item-qty" style={{ fontSize: '0.9em' }}>
                  {item.qty} x {item.productPrice.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center column - Order date */}
        <div className="order-date col-span-1 flex items-center">
          <span className="italic">{order.createdAt.text}</span>
        </div>

        {/* Right column - Order info and statuses */}
        <div className="order-total col-span-1 flex flex-col justify-between gap-3">
          <div className="order-header">
            <div className="order-number">
              <span className="font-bold">
                {/* @ts-ignore - Function signature differs in runtime */}
                {_('Order')}: #{order.orderNumber}
              </span>
            </div>
            <div className="order-total-value font-bold">
              {/* @ts-ignore - Function signature differs in runtime */}
              {_('Total')}:{order.grandTotal.text}
            </div>
          </div>

          {/* Statuses at the bottom */}
          {(shipmentStatus || paymentStatus) && (
            <div className="order-statuses flex gap-12 mt-4">
              {shipmentStatus && (
                <div className="shipment-status flex flex-col">
                  {/* @ts-ignore - Function signature differs in runtime */}
                  <span className="text-sm font-semibold mb-2 text-center">{_('Shipment')}:</span>
                  <Badge
                    title={shipmentStatus.name}
                    variant={shipmentStatus.badge}
                    progress={shipmentStatus.progress || getProgress(shipmentStatus.code, 'shipment')}
                  />
                </div>
              )}
              {paymentStatus && (
                <div className="payment-status flex flex-col">
                  {/* @ts-ignore - Function signature differs in runtime */}
                  <span className="text-sm font-semibold mb-2 text-center">{_('Payment')}:</span>
                  <Badge
                    title={paymentStatus.name}
                    variant={paymentStatus.badge}
                    progress={paymentStatus.progress || getProgress(paymentStatus.code, 'payment')}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

OrderWithStatuses.propTypes = {
  order: PropTypes.shape({
    orderId: PropTypes.string.isRequired,
    shipmentStatus: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
      badge: PropTypes.string.isRequired,
      progress: PropTypes.string,
    }),
    paymentStatus: PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
      badge: PropTypes.string.isRequired,
      progress: PropTypes.string,
    }),
  }).isRequired,
};

