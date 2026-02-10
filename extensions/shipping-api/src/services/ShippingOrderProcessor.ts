/**
 * Процессор для создания отправления после успешной оплаты заказа
 * Вызывается после создания заказа в EverShop
 */

import { ShippingProviderService } from './ShippingProviderService.js';
import { toProviderFormat } from '../mappers/AddressMapper.js';
import { ShippingBookingRequest } from '../adapters/types.js';

export default async function shippingOrderProcessor(order: any, context: any) {
  try {
    // Проверка условий
    if (!order) {
      return;
    }

    // Проверка оплаты
    const paymentStatus = order.payment_status;
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'captured';
    if (!isPaid) {
      // Оплата еще не завершена, пропускаем создание отправления
      return;
    }

    // Проверка метода доставки
    let shippingMethod: any;
    try {
      shippingMethod = typeof order.shipping_method === 'string' 
        ? JSON.parse(order.shipping_method) 
        : order.shipping_method;
    } catch (e) {
      // shipping_method не JSON, значит обычный метод EverShop
      return;
    }

    if (!shippingMethod || !shippingMethod.provider) {
      // Обычный метод доставки, не требует создания отправления через API
      return;
    }

    const providerCode = shippingMethod.provider;
    const deliveryOptionId = shippingMethod.metadata?.deliveryOptionId;

    if (!deliveryOptionId) {
      // @ts-ignore
      const { getLogger } = await import('@evershop/evershop/lib/log/log');
      const logger = getLogger();
      logger.warn('deliveryOptionId not found in shipping method metadata', { orderId: order.order_id });
      return;
    }

    // Загружаем данные заказа
    // @ts-ignore
    const { select } = await import('@evershop/postgres-query-builder');
    // @ts-ignore - EverShop resolves these modules at runtime
    const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
    // getConnection() returns PoolClient, pool is Pool - both work with load/execute
    const connection: any = pool || await getConnection();

    // Загружаем адрес доставки
    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(connection);

    if (!shippingAddress) {
      throw new Error('Shipping address not found');
    }

    // Загружаем товары заказа
    const orderItems = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(connection);

    if (!orderItems || orderItems.length === 0) {
      throw new Error('Order items not found');
    }

    // Получаем адрес отправителя из конфигурации
    const setting = await select()
      .from('setting')
      .where('name', '=', 'shipping_api')
      .load(connection);

    if (!setting) {
      throw new Error('Shipping API configuration not found');
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

    const providerConfig = configData?.providers?.[providerCode];
    if (!providerConfig || !providerConfig.from_address) {
      throw new Error(`Provider ${providerCode} configuration not found`);
    }

    const fromAddress = providerConfig.from_address;

    // Преобразуем адрес получателя
    const toAddress = toProviderFormat(shippingAddress);

    // Рассчитываем вес и габариты
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const item of orderItems) {
      totalWeight += (parseFloat(item.product_weight) || 0) * parseInt(item.qty);

      // Загружаем габариты товара
      const product = await select()
        .from('product')
        .where('product_id', '=', item.product_id)
        .load(connection);

      if (product) {
        maxLength = Math.max(maxLength, parseFloat(product.length_cm) || 0);
        maxWidth = Math.max(maxWidth, parseFloat(product.width_cm) || 0);
        maxHeight = Math.max(maxHeight, parseFloat(product.height_cm) || 0);
      }
    }

    // Подготавливаем запрос для создания отправления
    const bookingRequest: ShippingBookingRequest = {
      selectedOptionId: deliveryOptionId,
      orderId: order.order_id.toString(),
      orderNumber: order.order_number,
      from: fromAddress,
      to: toAddress,
      recipient: {
        name: shippingAddress.full_name,
        phone: shippingAddress.telephone,
        email: order.customer_email
      },
      weight: totalWeight,
      dimensions: {
        length: maxLength || 20,
        width: maxWidth || 15,
        height: maxHeight || 10
      },
      declaredValue: {
        amount: parseFloat(order.sub_total_incl_tax) || 0,
        currency: order.currency || 'NOK'
      }
    };

    // Создаем отправление
    const service = ShippingProviderService.getInstance();
    const result = await service.createShipment(providerCode, bookingRequest);

    // Сохраняем в БД
    try {
      // Проверяем, не создано ли уже отправление
      const existingShipment = await select()
        .from('shipment')
        .where('shipment_order_id', '=', order.order_id)
        .load(connection);

      if (existingShipment) {
        // Обновляем существующее отправление
        // @ts-ignore - EverShop resolves these modules at runtime
        const { update } = await import('@evershop/postgres-query-builder');
        await update('shipment')
          .given({
            carrier: service.getProviderName(providerCode),
            tracking_number: result.trackingNumber,
            provider_code: providerCode,
            provider_order_id: result.bookingId || null,
            qr_code_url: result.qrCodeUrl || null,
            label_url: result.labelUrl || null,
            metadata: result.metadata ? JSON.stringify(result.metadata) : null,
            updated_at: new Date()
          })
          .where('shipment_order_id', '=', order.order_id)
          .execute(connection);
      } else {
        // Создаем новое отправление
        // @ts-ignore - EverShop resolves these modules at runtime
        const { insert } = await import('@evershop/postgres-query-builder');
        const { v4: uuidv4 } = await import('uuid');
        await insert('shipment')
          .given({
            uuid: uuidv4(),
            shipment_order_id: order.order_id,
            carrier: service.getProviderName(providerCode),
            tracking_number: result.trackingNumber,
            provider_code: providerCode,
            provider_order_id: result.bookingId || null,
            qr_code_url: result.qrCodeUrl || null,
            label_url: result.labelUrl || null,
            metadata: result.metadata ? JSON.stringify(result.metadata) : null,
            created_at: new Date(),
            updated_at: new Date()
          })
          .execute(connection);
      }

      // Добавляем запись в order_activity
      // @ts-ignore - EverShop resolves these modules at runtime
      const { insert } = await import('@evershop/postgres-query-builder');
      const { v4: uuidv4 } = await import('uuid');
      await insert('order_activity')
        .given({
          uuid: uuidv4(),
          order_activity_order_id: order.order_id,
          comment: `Отправление создано в ${service.getProviderName(providerCode)}. Трек-номер: ${result.trackingNumber}`,
          customer_notified: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute(connection);

      // Отправляем email продавцу с QR кодом
      if (result.qrCodeUrl && providerConfig.sender_email) {
        try {
          // @ts-ignore
          const { sendEmail } = await import('@evershop/evershop/lib/util/email');
          
          await sendEmail({
            to: providerConfig.sender_email,
            subject: `Новый заказ #${order.order_number} - требуется отправка`,
            html: `
              <h2>Новый заказ #${order.order_number}</h2>
              <p>Требуется отправка товара через ${service.getProviderName(providerCode)}.</p>
              
              <h3>Данные получателя:</h3>
              <p>
                ${shippingAddress.full_name}<br>
                ${shippingAddress.address_1}<br>
                ${shippingAddress.postcode} ${shippingAddress.city}<br>
                Телефон: ${shippingAddress.telephone}
              </p>
              
              <h3>Товары:</h3>
              <ul>
                ${orderItems.map((item: any) => `<li>${item.product_name} x${item.qty}</li>`).join('')}
              </ul>
              
              <h3>QR код для отправки:</h3>
              <p>
                <a href="${result.qrCodeUrl}">
                  <img src="${result.qrCodeUrl}" alt="QR Code" style="max-width: 300px;" />
                </a>
              </p>
              
              <h3>Инструкции:</h3>
              <ol>
                <li>Упакуйте товар согласно заказу</li>
                <li>Перейдите в ближайшее отделение ${service.getProviderName(providerCode)}</li>
                <li>Покажите QR код сотруднику отделения</li>
                <li>Сотрудник отсканирует QR код и примет посылку</li>
              </ol>
              
              <p>Трек-номер: <strong>${result.trackingNumber}</strong></p>
            `
          });
        } catch (emailError: any) {
          // Логируем ошибку отправки email, но не блокируем процесс
          // @ts-ignore
          const { getLogger } = await import('@evershop/evershop/lib/log/log');
          const logger = getLogger();
          logger.error('Failed to send email to seller', { error: emailError.message });
        }
      }
    } catch (dbError: any) {
      // Ошибка сохранения в БД - логируем, но не блокируем процесс
      // @ts-ignore
      const { getLogger } = await import('@evershop/evershop/lib/log/log');
      const logger = getLogger();
      logger.error('Failed to save shipment to database', {
        orderId: order.order_id,
        error: dbError.message
      });
      throw dbError; // Пробрасываем дальше для обработки внешним catch
    }
  } catch (error: any) {
    // Логируем ошибку, но не блокируем создание заказа
    // @ts-ignore
    const { getLogger } = await import('@evershop/evershop/lib/log/log');
    const logger = getLogger();
    logger.error('Failed to create shipment', {
      orderId: order.order_id,
      error: error.message,
      stack: error.stack
    });

    // Сохраняем ошибку в order_activity
    try {
      // @ts-ignore
      const { insert } = await import('@evershop/postgres-query-builder');
      // @ts-ignore - EverShop resolves these modules at runtime
      const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
      // getConnection() returns PoolClient, pool is Pool - both work with load/execute
      const connection: any = pool || await getConnection();
      const { v4: uuidv4 } = await import('uuid');

      await insert('order_activity')
        .given({
          uuid: uuidv4(),
          order_activity_order_id: order.order_id,
          comment: `Ошибка создания отправления: ${error.message}. Требуется ручное создание.`,
          customer_notified: false,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute(connection);
    } catch (activityError: any) {
      logger.error('Failed to save error to order_activity', { error: activityError.message });
    }
  }
}

