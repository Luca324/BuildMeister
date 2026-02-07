// @ts-ignore - Webpack resolves this at runtime
// Using .js extension for webpack module resolution
import OrderWithStatuses from '../../../components/frontStore/customer/detail/OrderWithStatuses.js';
import PropTypes from 'prop-types';
import React from 'react';
// @ts-ignore - EverShop resolves these modules at runtime
// @ts-ignore - Function signature may differ in runtime
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface OrderHistoryProps {
  customer?: {
    orders?: Array<{
      orderId: string;
      orderNumber: string;
      createdAt: {
        text: string;
      };
      shipmentStatus?: {
        name: string;
        code: string;
        badge: string;
        progress?: string;
      };
      shipment?: {
        carrier?: string;
        trackingNumber?: string;
      };
      paymentStatus?: {
        name: string;
        code: string;
        badge: string;
        progress?: string;
      };
      grandTotal: {
        value: number;
        text: string;
      };
      items: Array<{
        productName: string;
        thumbnail?: string;
        productPrice: {
          value: number;
          text: string;
        };
        productSku: string;
        qty: number;
      }>;
    }>;
  };
  carriers?: Array<{
    name: string;
    code: string;
    trackingUrl?: string;
  }>;
}

export default function OrderHistory({ customer, carriers }: OrderHistoryProps) {
  const orders = customer?.orders || [];

  console.log('[OrderHistory] Debug:', {
    ordersCount: orders.length,
    carriers,
    carriersCount: carriers?.length || 0,
    firstOrder: orders[0] ? {
      orderId: orders[0].orderId,
      shipment: orders[0].shipment,
    } : null,
  });

  if (orders.length === 0) {
    return (
      <div className="order-history-empty">
        {/* @ts-ignore - Function signature differs in runtime */}
        {_('You have not placed any orders yet')}
      </div>
    );
  }

  return (
    <div className="order-history order-history-with-statuses divide-y">
      {orders.map((order) => (
        <div className="order-history-order border-divider py-8" key={order.orderId}>
          <OrderWithStatuses order={order} carriers={carriers || []} />
        </div>
      ))}
    </div>
  );
}

OrderHistory.propTypes = {
  customer: PropTypes.shape({
    orders: PropTypes.arrayOf(
      PropTypes.shape({
        orderId: PropTypes.string.isRequired,
        orderNumber: PropTypes.string.isRequired,
        createdAt: PropTypes.shape({
          text: PropTypes.string.isRequired,
        }).isRequired,
        shipmentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired,
          progress: PropTypes.string,
        }),
        shipment: PropTypes.shape({
          carrier: PropTypes.string,
          trackingNumber: PropTypes.string,
        }),
        paymentStatus: PropTypes.shape({
          name: PropTypes.string.isRequired,
          code: PropTypes.string.isRequired,
          badge: PropTypes.string.isRequired,
          progress: PropTypes.string,
        }),
        grandTotal: PropTypes.shape({
          value: PropTypes.number.isRequired,
          text: PropTypes.string.isRequired,
        }).isRequired,
        items: PropTypes.arrayOf(
          PropTypes.shape({
            productName: PropTypes.string.isRequired,
            thumbnail: PropTypes.string,
            productPrice: PropTypes.shape({
              value: PropTypes.number.isRequired,
              text: PropTypes.string.isRequired,
            }).isRequired,
            productSku: PropTypes.string.isRequired,
            qty: PropTypes.number.isRequired,
          })
        ).isRequired,
      })
    ),
  }),
  carriers: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
      trackingUrl: PropTypes.string,
    })
  ),
};

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 10, // Same as default OrderHistory - this component overrides it
};

export const query = `
  query Query {
    customer: currentCustomer {
      orders {
        orderId
        orderNumber
        createdAt {
          text
        }
        shipmentStatus {
          name
          code
          badge
          progress
        }
        shipment {
          carrier
          trackingNumber
        }
        paymentStatus {
          name
          code
          badge
          progress
        }
        grandTotal {
          value
          text
        }
        items {
          productName
          thumbnail
          productPrice {
            value
            text
          }
          productSku
          qty
        }
      }
    }
    carriers {
      name
      code
      trackingUrl
    }
  }
`;


