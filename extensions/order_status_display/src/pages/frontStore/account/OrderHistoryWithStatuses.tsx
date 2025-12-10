// @ts-ignore - Webpack resolves this at runtime
// Using .js extension for webpack module resolution
import OrderWithStatuses from '../../../components/frontStore/customer/detail/OrderWithStatuses.js';
import PropTypes from 'prop-types';
import React from 'react';
// @ts-ignore - EverShop resolves these modules at runtime
// @ts-ignore - Function signature may differ in runtime
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface OrderHistoryWithStatusesProps {
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
}

export default function OrderHistoryWithStatuses({ customer }: OrderHistoryWithStatusesProps) {
  const orders = customer?.orders || [];

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
          <OrderWithStatuses order={order} />
        </div>
      ))}
    </div>
  );
}

OrderHistoryWithStatuses.propTypes = {
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
};

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 5, // Before the default OrderHistory (which has sortOrder 10)
  // This component replaces the default OrderHistory
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
  }
`;

