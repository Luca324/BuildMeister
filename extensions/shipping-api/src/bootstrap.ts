/**
 * Bootstrap функция - точка входа расширения
 * 
 * Эта функция вызывается EverShop при загрузке расширения.
 * Регистрирует все компоненты расширения: адаптеры провайдеров доставки и процессоры.
 * 
 * Порядок выполнения:
 * 1. Создается singleton экземпляр ShippingProviderService
 * 2. Регистрируются адаптеры провайдеров (PostNord, в будущем и Helthjem)
 * 3. Регистрируется процессор для автоматического создания отправлений после оплаты
 */

// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry';
import { PostNordAdapter } from './adapters/PostNordAdapter.js';
import { ShippingProviderService } from './services/ShippingProviderService.js';
import shippingOrderProcessor from './services/ShippingOrderProcessor.js';
import shippingCalculationProcessor from './services/ShippingCalculationProcessor.js';

export default () => {
  // Создаем экземпляр сервиса (singleton)
  // Singleton гарантирует, что все части расширения используют один и тот же экземпляр
  const shippingService = ShippingProviderService.getInstance();

  // Регистрируем адаптеры провайдеров доставки
  // Каждый адаптер реализует интерфейс BaseShippingAdapter
  shippingService.registerAdapter(new PostNordAdapter());
  // В будущем можно добавить:
  // shippingService.registerAdapter(new HelthjemAdapter());

  /**
   * Регистрация процессора расчета стоимости доставки
   * 
   * Этот процессор добавляет динамические варианты доставки от API провайдеров
   * в стандартный список методов доставки EverShop.
   * 
   * @param cart - объект корзины
   * @param methods - массив существующих методов доставки
   * @param context - контекст выполнения
   * @returns массив методов доставки с добавленными динамическими вариантами
   */
  // @ts-ignore - EverShop resolves processor signature at runtime
  addProcessor('cartCalculateShipping', async (cart: any, methods: any[], context: any) => {
    return await shippingCalculationProcessor(cart, methods, context);
  }, 100);

  /**
   * Регистрация процессора создания отправления после оплаты заказа
   * 
   * ОШИБКА, КОТОРУЮ МЫ ФИКСИЛИ:
   * Изначально было: addProcessor('orderCreateAfter', shippingOrderProcessor, 100);
   * 
   * ПРОБЛЕМА:
   * - addProcessor ожидает функцию с сигнатурой SyncProcessor или AsyncProcessor
   * - shippingOrderProcessor - это async функция, но TypeScript не мог правильно вывести тип
   * - Ошибка: "Argument of type '(order: any, context: any) => Promise<void>' is not assignable"
   * 
   * РЕШЕНИЕ:
   * - Обернули вызов в async arrow function внутри addProcessor
   * - Это гарантирует правильную сигнатуру и обработку Promise
   * 
   * КАК ИЗБЕЖАТЬ В БУДУЩЕМ:
   * - Всегда проверяйте сигнатуру процессоров в документации EverShop
   * - Если процессор async, оборачивайте его в async функцию при регистрации
   * - Используйте @ts-ignore только если точно уверены, что типы не совпадают из-за runtime resolution
   * 
   * @param order - объект заказа после создания
   * @param context - контекст выполнения (содержит connection, request и т.д.)
   * @param priority - приоритет выполнения (100 = выполняется после стандартных процессоров)
   */
  // @ts-ignore - EverShop resolves processor signature at runtime
  addProcessor('orderCreateAfter', async (order: any, context: any) => {
    await shippingOrderProcessor(order, context);
  }, 100);
};

