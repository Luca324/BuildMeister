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
  console.log('[SHIPPING-API] ShippingCalculationProcessor вызван', {
    cartId: cart?.cart_id,
    shippingAddressId: cart?.shipping_address_id,
    existingMethodsCount: methods?.length || 0
  });

  // Проверяем, заполнен ли адрес доставки
  if (!cart.shipping_address_id) {
    // Если адрес не заполнен, возвращаем стандартные методы без изменений
    console.log('[SHIPPING-API] Ранний выход: shipping_address_id отсутствует');
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
      console.log('[SHIPPING-API] Ранний выход: адрес доставки не найден в БД');
      return methods;
    }

    console.log('[SHIPPING-API] Адрес доставки загружен:', {
      postcode: shippingAddress.postcode,
      city: shippingAddress.city,
      address_1: shippingAddress.address_1,
      country: shippingAddress.country
    });

    // Проверяем, что адрес заполнен полностью
    if (!shippingAddress.postcode || !shippingAddress.city || 
        !shippingAddress.address_1 || !shippingAddress.country) {
      console.log('[SHIPPING-API] Ранний выход: адрес заполнен не полностью', {
        hasPostcode: !!shippingAddress.postcode,
        hasCity: !!shippingAddress.city,
        hasAddress1: !!shippingAddress.address_1,
        hasCountry: !!shippingAddress.country
      });
      return methods;
    }

    // Загружаем товары корзины для расчета веса и габаритов
    const cartItems = await select()
      .from('cart_item')
      .where('cart_id', '=', cart.cart_id)
      .execute(connection);

    if (!cartItems || cartItems.length === 0) {
      console.log('[SHIPPING-API] Ранний выход: нет товаров в корзине');
      return methods;
    }

    console.log('[SHIPPING-API] Товары в корзине:', cartItems.length);

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

    console.log('[SHIPPING-API] Рассчитаны вес и габариты:', {
      totalWeight: totalWeight,
      dimensions: { length: maxLength, width: maxWidth, height: maxHeight }
    });

    // Получаем адрес отправителя из конфигурации
    const { select: selectSetting } = await import('@evershop/postgres-query-builder');
    const setting = await selectSetting()
      .from('setting')
      .where('name', '=', 'shipping_api')
      .load(connection);

    if (!setting) {
      console.log('[SHIPPING-API] Ранний выход: конфигурация shipping_api не найдена в БД');
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
    console.log('[SHIPPING-API] Провайдеры в конфигурации:', Object.keys(providers));
    
    let senderAddress: any = null;
    let foundProviderCode: string | null = null;

    for (const [code, config] of Object.entries(providers)) {
      const providerConfig = config as any;
      console.log(`[SHIPPING-API] Проверка провайдера ${code}:`, {
        enabled: providerConfig.enabled,
        hasFromAddress: !!providerConfig.from_address
      });
      if (providerConfig.enabled && providerConfig.from_address) {
        senderAddress = providerConfig.from_address;
        foundProviderCode = code;
        break;
      }
    }

    if (!senderAddress) {
      console.log('[SHIPPING-API] Ранний выход: не найден активный провайдер с from_address');
      return methods;
    }

    console.log('[SHIPPING-API] Найден провайдер с адресом отправителя:', foundProviderCode, senderAddress);

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
    console.log('[SHIPPING-API] Запрос к провайдерам:', calculationRequest);
    const shippingService = ShippingProviderService.getInstance();
    const providerResults = await shippingService.calculateAll(calculationRequest);
    console.log('[SHIPPING-API] Результаты от провайдеров:', providerResults.map(r => ({
      provider: r.provider,
      providerName: r.providerName,
      optionsCount: r.options.length,
      error: r.error
    })));

    // Преобразуем варианты от провайдеров в формат методов доставки EverShop
    const dynamicMethods: any[] = [];

    for (const providerResult of providerResults) {
      // Если у провайдера есть ошибка, пропускаем его
      if (providerResult.error) {
        console.log(`[SHIPPING-API] Пропуск провайдера ${providerResult.provider} из-за ошибки:`, providerResult.error);
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
    console.log('[SHIPPING-API] Итоговый результат:', {
      staticMethodsCount: methods.length,
      dynamicMethodsCount: dynamicMethods.length,
      totalMethodsCount: methods.length + dynamicMethods.length,
      dynamicMethods: dynamicMethods.map(m => ({ id: m.id, name: m.name, price: m.price }))
    });
    return [...methods, ...dynamicMethods];

  } catch (error: any) {
    // В случае ошибки возвращаем стандартные методы без изменений
    // Логируем ошибку для отладки
    console.error('[SHIPPING-API] ОШИБКА в shippingCalculationProcessor:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    return methods;
  }
}

