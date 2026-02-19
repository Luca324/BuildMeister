/**
 * Процессор для добавления динамических вариантов доставки от API провайдеров
 * в стандартный список методов доставки EverShop
 * 
 * Этот процессор вызывается EverShop при расчете стоимости доставки для корзины.
 * Он добавляет динамические варианты от PostNord, Helthjem и других провайдеров
 * в стандартный список методов доставки, чтобы они отображались в нативном
 * компоненте ShippingMethods EverShop вместе со статическими методами.
 */

import { ShippingProviderService } from './ShippingProviderService.js';
import { AddressMapper } from '../mappers/AddressMapper.js';
import { ShippingCalculationRequest } from '../adapters/types.js';

/**
 * Процессор cartCalculateShipping
 * 
 * Добавляет динамические варианты доставки от API провайдеров в список методов доставки.
 * 
 * @param cart - объект корзины EverShop
 * @param methods - массив существующих методов доставки (может быть пустым или содержать статические методы)
 * @param context - контекст выполнения (содержит connection, request и т.д.)
 * @returns массив методов доставки с добавленными динамическими вариантами
 */
export default async function shippingCalculationProcessor(
  cart: any,
  methods: any[],
  context: any
): Promise<any[]> {
  // Проверяем, заполнен ли адрес доставки
  if (!cart.shipping_address_id) {
    // Если адрес не заполнен, возвращаем стандартные методы без изменений
    return methods;
  }

  try {
    // Загружаем адрес доставки
    const { select } = await import('@evershop/postgres-query-builder');
    const { pool } = await import('@evershop/evershop/lib/postgres');
    const connection: any = pool || await context.connection;

    const shippingAddress = await select()
      .from('cart_address')
      .where('cart_address_id', '=', cart.shipping_address_id)
      .load(connection);

    if (!shippingAddress) {
      return methods;
    }

    // Проверяем, что адрес заполнен полностью
    if (!shippingAddress.postcode || !shippingAddress.city || 
        !shippingAddress.address_1 || !shippingAddress.country) {
      return methods;
    }

    // Загружаем товары корзины для расчета веса и габаритов
    const cartItems = await select()
      .from('cart_item')
      .where('cart_id', '=', cart.cart_id)
      .execute(connection);

    if (!cartItems || cartItems.length === 0) {
      return methods;
    }

    // Рассчитываем общий вес и габариты
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const item of cartItems) {
      // Загружаем информацию о товаре
      const product = await select()
        .from('product')
        .where('product_id', '=', item.product_id)
        .load(connection);

      if (product) {
        const itemWeight = (product.weight || 0) * item.qty;
        totalWeight += itemWeight;

        // Максимальные габариты (берем наибольшие по каждой стороне)
        if (product.length_cm) {
          maxLength = Math.max(maxLength, product.length_cm);
        }
        if (product.width_cm) {
          maxWidth = Math.max(maxWidth, product.width_cm);
        }
        if (product.height_cm) {
          maxHeight = Math.max(maxHeight, product.height_cm);
        }
      }
    }

    // Получаем адрес отправителя из конфигурации
    const { select: selectSetting } = await import('@evershop/postgres-query-builder');
    const setting = await selectSetting()
      .from('setting')
      .where('name', '=', 'shipping_api')
      .load(connection);

    if (!setting) {
      return methods;
    }

    let configData: any;
    if (setting.is_json) {
      configData = typeof setting.value === 'string' 
        ? JSON.parse(setting.value) 
        : setting.value;
    } else {
      configData = typeof setting.value === 'string' 
        ? JSON.parse(setting.value) 
        : setting.value;
    }

    // Получаем первый активный провайдер для адреса отправителя
    const providers = configData?.providers || {};
    let senderAddress: any = null;

    for (const [code, config] of Object.entries(providers)) {
      const providerConfig = config as any;
      if (providerConfig.enabled && providerConfig.from_address) {
        senderAddress = providerConfig.from_address;
        break;
      }
    }

    if (!senderAddress) {
      return methods;
    }

    // Преобразуем адреса в формат для API
    const fromAddress = AddressMapper.toStandardFormat(senderAddress);
    const toAddress = AddressMapper.toStandardFormat({
      streetName: shippingAddress.address_1,
      streetNumber: shippingAddress.address_2 || '',
      city: shippingAddress.city,
      postcode: shippingAddress.postcode,
      country: shippingAddress.country,
      province: shippingAddress.province || ''
    });

    // Подготавливаем запрос для расчета доставки
    const calculationRequest: ShippingCalculationRequest = {
      from: fromAddress,
      to: toAddress,
      weight: totalWeight || 1, // Минимум 1 кг, если вес не указан
      dimensions: {
        length: maxLength || 20,
        width: maxWidth || 15,
        height: maxHeight || 10
      }
    };

    // Получаем варианты от всех активных провайдеров
    const shippingService = ShippingProviderService.getInstance();
    const providerResults = await shippingService.calculateAll(calculationRequest);

    // Преобразуем варианты от провайдеров в формат методов доставки EverShop
    const dynamicMethods: any[] = [];

    for (const providerResult of providerResults) {
      // Если у провайдера есть ошибка, пропускаем его
      if (providerResult.error) {
        continue;
      }

      // Добавляем каждый вариант как отдельный метод доставки
      for (const option of providerResult.options) {
        // Формируем уникальный ID метода (комбинация провайдера и option ID)
        const methodId = `api_${providerResult.provider}_${option.id}`;

        // Формируем название метода
        let methodName = `${providerResult.providerName} - ${option.name}`;
        if (option.estimatedDays) {
          methodName += ` (${option.estimatedDays} дн.)`;
        }

        // Создаем объект метода доставки в формате EverShop
        // Формат должен соответствовать тому, что ожидает стандартный компонент ShippingMethods
        const shippingMethod = {
          id: methodId,
          method_id: methodId,
          name: methodName,
          cost: option.price,
          costExclTax: option.price,
          costInclTax: option.price,
          price: option.price,
          // Сохраняем метаданные для последующего использования при создании отправления
          provider: providerResult.provider,
          metadata: {
            provider: providerResult.provider,
            optionId: option.id,
            deliveryOptionId: option.id,
            serviceCode: option.serviceCode,
            estimatedDays: option.estimatedDays,
            ...option.metadata
          }
        };

        dynamicMethods.push(shippingMethod);
      }
    }

    // Объединяем стандартные методы с динамическими
    // Динамические методы добавляются в конец списка
    return [...methods, ...dynamicMethods];

  } catch (error: any) {
    // В случае ошибки возвращаем стандартные методы без изменений
    // Логируем ошибку для отладки
    console.error('Error in shippingCalculationProcessor:', error);
    return methods;
  }
}

