// @ts-ignore - EverShop resolves these modules at runtime
import Badge from '@components/common/Badge';
import PropTypes from 'prop-types';
import React from 'react';
// @ts-ignore - EverShop resolves these modules at runtime
import { _ } from '@evershop/evershop/lib/locale/translate/_';

interface OrderStatusesProps {
  order?: {
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

export default function OrderStatuses({ order }: OrderStatusesProps) {
  if (!order) {
    return null;
  }

  const { shipmentStatus, paymentStatus } = order;

  if (!shipmentStatus && !paymentStatus) {
    return null;
  }

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
    <div className="order-statuses flex flex-wrap gap-4 mt-4">
      {shipmentStatus && (
        <div className="shipment-status flex items-center gap-2">
          {/* @ts-ignore - Function signature differs in runtime */}
          <span className="text-sm font-semibold">{_('Shipment')}:</span>
          <Badge
            title={shipmentStatus.name}
            variant={shipmentStatus.badge}
            progress={shipmentStatus.progress || getProgress(shipmentStatus.code, 'shipment')}
          />
        </div>
      )}
      {paymentStatus && (
        <div className="payment-status flex items-center gap-2">
          {/* @ts-ignore - Function signature differs in runtime */}
          <span className="text-sm font-semibold">{_('Payment')}:</span>
          <Badge
            title={paymentStatus.name}
            variant={paymentStatus.badge}
            progress={paymentStatus.progress || getProgress(paymentStatus.code, 'payment')}
          />
        </div>
      )}
    </div>
  );
}

OrderStatuses.propTypes = {
  order: PropTypes.shape({
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
  }),
};

