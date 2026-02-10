/**
 * Bootstrap функция - точка входа расширения
 * Регистрирует все компоненты расширения: адаптеры, процессоры
 */

// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry';
import { PostNordAdapter } from './adapters/PostNordAdapter.js';
import { ShippingProviderService } from './services/ShippingProviderService.js';
import shippingOrderProcessor from './services/ShippingOrderProcessor.js';

export default () => {
  // Создаем экземпляр сервиса (singleton)
  const shippingService = ShippingProviderService.getInstance();

  // Регистрируем адаптеры
  shippingService.registerAdapter(new PostNordAdapter());
  // В будущем можно добавить:
  // shippingService.registerAdapter(new HelthjemAdapter());
  // shippingService.registerAdapter(new BringAdapter());

  // Регистрируем процессор создания отправления после оплаты
  // Процессор вызывается после создания заказа
  addProcessor('orderCreateAfter', shippingOrderProcessor, 100);
};

