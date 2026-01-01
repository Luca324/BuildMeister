import { useEffect } from 'react';

// This component hides the default OrderHistory component
// by finding and hiding elements that don't have our status component
export default function HideDefaultOrderHistory() {
  useEffect(() => {
    // Wait for DOM to be ready
    const hideDefault = () => {
      // Find all order-history elements
      const orderHistories = document.querySelectorAll('.order-history');
      orderHistories.forEach((el) => {
        // If this order-history doesn't contain our status component, hide it
        if (!el.querySelector('.order-statuses')) {
          (el as HTMLElement).style.display = 'none';
        }
      });
    };

    // Run immediately and after a short delay to catch dynamically rendered content
    hideDefault();
    const timeout = setTimeout(hideDefault, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return null;
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 20, // After both components
};

