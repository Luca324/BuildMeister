/**
 * Адаптер для интеграции с Bring API
 * Реализует все методы базового класса для работы с Bring
 * 
 * ВАЖНО: Этот адаптер создан на основе общей архитектуры.
 * Для полной реализации необходима документация Bring API с точными endpoints и форматами данных.
 */

import { BaseShippingAdapter } from './BaseShippingAdapter.js';
import {
  ShippingOption,
  ShippingCalculationRequest,
  ShippingBookingRequest,
  ShippingBookingResult,
  TrackingInfo,
  ShippingProviderUnavailableError,
  ShippingProviderTimeoutError,
  ShippingAddressInvalidError,
  ShippingBookingError,
  ShippingTrackingError
} from './types.js';

interface BringConfig {
  enabled: boolean;
  api_key: string; // API ключ из Mybring
  api_uid: string; // Email пользователя Mybring
  client_url: string; // URL вашего сервиса (например, buildmeister.no)
  customer_number?: string; // Номер клиента в системе Bring (если требуется)
  from_address: {
    countryCode: string;
    postalCode: string;
    city: string;
    streetName: string;
    streetNumber: string;
  };
  sender_email: string;
  api_base_url?: string; // Для sandbox или production
}

interface BringDeliveryOption {
  // Структура зависит от реального API Bring
  // Примерная структура на основе типичных API доставки:
  serviceId?: string;
  serviceName?: string;
  price?: {
    amount: number;
    currency: string;
  };
  estimatedDays?: number;
  [key: string]: any; // Для дополнительных полей от API
}

interface BringBookingResponse {
  trackingNumber: string;
  bookingId?: string;
  qrCodeUrl?: string;
  labelUrl?: string;
  [key: string]: any;
}

export class BringAdapter extends BaseShippingAdapter {
  private config: BringConfig | null = null;
  // Базовый URL Bring API согласно документации
  private readonly API_BASE_URL = 'https://api.bring.com';
  private readonly REQUEST_TIMEOUT = 15000; // 15 секунд

  constructor() {
    super();
  }

  getProviderCode(): string {
    return 'bring';
  }

  getProviderName(): string {
    return 'Bring';
  }

  /**
   * Получение конфигурации из SETTINGS
   * @private
   */
  private async getConfig(): Promise<BringConfig> {
    if (this.config) {
      return this.config;
    }

    // @ts-ignore - EverShop resolves these modules at runtime
    const { select } = await import('@evershop/postgres-query-builder');
    // @ts-ignore
    // @ts-ignore - EverShop resolves these modules at runtime
    const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
    const connection: any = pool || await getConnection();

    const setting = await select()
      .from('setting')
      .where('name', '=', 'shipping_api')
      .load(connection);

    if (!setting) {
      throw new Error('Shipping API configuration not found in settings');
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

    const providerConfig = configData?.providers?.bring;
    if (!providerConfig) {
      throw new Error('Bring configuration not found');
    }

    if (!providerConfig.enabled) {
      throw new Error('Bring provider is disabled');
    }

    if (!providerConfig.api_key) {
      throw new Error('Bring API key is not configured');
    }

    if (!providerConfig.api_uid) {
      throw new Error('Bring API UID (email) is not configured');
    }

    if (!providerConfig.client_url) {
      throw new Error('Bring Client URL is not configured');
    }

    this.config = {
      enabled: providerConfig.enabled,
      api_key: providerConfig.api_key,
      api_uid: providerConfig.api_uid,
      client_url: providerConfig.client_url,
      customer_number: providerConfig.customer_number,
      from_address: providerConfig.from_address,
      sender_email: providerConfig.sender_email,
      api_base_url: providerConfig.api_base_url || this.API_BASE_URL
    };

    return this.config;
  }

  /**
   * Выполнение HTTP запроса к Bring API
   * @private
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const config = await this.getConfig();
    const url = `${config.api_base_url || this.API_BASE_URL}${endpoint}`;

    // Формат авторизации Bring API согласно документации:
    // Требуются три заголовка: X-Mybring-API-Uid, X-Mybring-API-Key, X-Bring-Client-URL
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Mybring-API-Uid': config.api_uid, // Email пользователя Mybring
      'X-Mybring-API-Key': config.api_key,  // API ключ
      'X-Bring-Client-URL': config.client_url // URL вашего сервиса
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bring API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new ShippingProviderTimeoutError(this.getProviderCode());
      }

      if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
        throw new ShippingProviderUnavailableError(this.getProviderCode(), error);
      }

      throw error;
    }
  }

  /**
   * Расчет стоимости доставки
   * 
   * Использует Shipping Guide API v2 для получения доступных продуктов и цен
   * Согласно документации: https://developer.bring.com/api/shipping-guide_2/
   * 
   * ВАЖНО: Формат запроса и ответа основан на типичной структуре Shipping Guide API.
   * Может потребоваться уточнение на основе реальной документации.
   * 
   * Bring Shipping Guide API обычно возвращает структуру с consignments, каждый из которых
   * содержит массив products с информацией о доступных способах доставки и ценах.
   */
  async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingOption[]> {
    try {
      const config = await this.getConfig();

      // Формат запроса для Shipping Guide API v2
      // Согласно документации Bring, используется POST запрос с адресами и параметрами посылки
      // Bring обычно использует формат с from/to объектами и параметрами посылки
      const apiRequest: any = {
        from: {
          countryCode: request.from.countryCode,
          postalCode: request.from.postalCode,
          city: request.from.city,
          streetName: request.from.streetName,
          streetNumber: request.from.streetNumber
        },
        to: {
          countryCode: request.to.countryCode,
          postalCode: request.to.postalCode,
          city: request.to.city,
          streetName: request.to.streetName,
          streetNumber: request.to.streetNumber
        },
        weightInKg: request.weight,
        length: request.dimensions.length,
        width: request.dimensions.width,
        height: request.dimensions.height
      };

      // Добавляем customer number, если указан (может быть обязательным для некоторых продуктов)
      if (config.customer_number) {
        apiRequest.customerNumber = config.customer_number;
      }

      // Добавляем объявленную стоимость, если указана
      if (request.declaredValue) {
        apiRequest.edi = {
          value: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      // Endpoint Shipping Guide API v2 для получения продуктов и цен
      // Согласно документации: POST /shippingguide/api/v2/products
      const response = await this.makeRequest(
        '/shippingguide/api/v2/products',
        'POST',
        apiRequest
      );

      // Формат ответа Shipping Guide API обычно содержит consignments
      // Каждый consignment содержит массив products с доступными способами доставки
      let products: any[] = [];
      
      if (response.consignments && Array.isArray(response.consignments)) {
        // Извлекаем продукты из каждого consignment
        products = response.consignments.flatMap((consignment: any) => 
          consignment.products || []
        );
      } else if (response.products && Array.isArray(response.products)) {
        products = response.products;
      } else if (Array.isArray(response)) {
        products = response;
      }

      if (products.length === 0) {
        // Адрес недоступен или нет вариантов доставки
        return [];
      }

      // Нормализуем варианты доставки
      const options: ShippingOption[] = products.map((product: any) => {
        // Извлекаем информацию о продукте
        // Bring обычно использует: productId, productCode, productName
        const productId = product.productId || product.id || product.code || product.productCode;
        const productName = product.productName || product.name || product.displayName || 'Bring Service';
        
        // Извлекаем цену
        // Bring обычно возвращает: price, listPrice, totalPrice
        const priceObj = product.price || product.listPrice || product.totalPrice || {};
        const price = typeof priceObj === 'number' ? priceObj : (priceObj.amount || priceObj.value || priceObj.withVAT || 0);
        const currency = priceObj.currency || 'NOK';

        // Извлекаем срок доставки
        // Bring обычно возвращает: expectedDelivery, estimatedDeliveryTime
        const deliveryTime = product.expectedDelivery || product.estimatedDeliveryTime || {};
        let estimatedDays: number | undefined;
        
        if (deliveryTime.workingDays) {
          estimatedDays = deliveryTime.workingDays;
        } else if (deliveryTime.days) {
          estimatedDays = deliveryTime.days;
        } else if (typeof deliveryTime === 'string') {
          // Если это дата, вычисляем разницу в днях
          const deliveryDate = new Date(deliveryTime);
          const today = new Date();
          const diffTime = deliveryDate.getTime() - today.getTime();
          estimatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          id: productId || `bring_${Date.now()}_${Math.random()}`,
          name: productName,
          price: price,
          currency: currency,
          estimatedDays: estimatedDays,
          serviceCode: productId,
          provider: this.getProviderCode(),
          metadata: {
            productId: productId,
            productCode: product.code || product.productCode,
            consignmentId: product.consignmentId,
            ...product // Сохраняем все дополнительные данные от API
          }
        };
      });

      return options;
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError) {
        throw error;
      }

      // Обработка ошибок валидации адреса
      if (error.message?.includes('invalid') || error.message?.includes('address') ||
          error.message?.includes('not found') || error.message?.includes('unavailable') ||
          error.message?.includes('not available')) {
        throw new ShippingAddressInvalidError(this.getProviderCode(), error.message);
      }

      throw new ShippingProviderUnavailableError(this.getProviderCode(), error);
    }
  }

  /**
   * Создание отправления
   * 
   * Использует Booking API для создания отправления
   * Согласно документации: https://developer.bring.com/api/booking/
   * 
   * ВАЖНО: Bring имеет два API для создания отправлений:
   * 1. Booking API - более простой, с валидацией (используем этот)
   * 2. Shipment API - более гибкий, требует знания портфолио услуг
   * 
   * Booking API проще в использовании и подходит для нашего случая.
   */
  async createBooking(request: ShippingBookingRequest): Promise<ShippingBookingResult> {
    try {
      const config = await this.getConfig();

      // Формат запроса для Booking API
      // Согласно документации Bring Booking API
      const apiRequest: any = {
        from: {
          countryCode: request.from.countryCode,
          postalCode: request.from.postalCode,
          city: request.from.city,
          streetName: request.from.streetName,
          streetNumber: request.from.streetNumber
        },
        to: {
          countryCode: request.to.countryCode,
          postalCode: request.to.postalCode,
          city: request.to.city,
          streetName: request.to.streetName,
          streetNumber: request.to.streetNumber
        },
        recipient: {
          name: request.recipient.name,
          phone: request.recipient.phone,
          email: request.recipient.email
        },
        product: {
          id: request.selectedOptionId, // Product ID из выбранного варианта доставки (из metadata)
        },
        weightInKg: request.weight,
        length: request.dimensions.length,
        width: request.dimensions.width,
        height: request.dimensions.height,
        orderReference: request.orderNumber // Для связи с заказом в системе
      };

      // Добавляем customer number, если указан (может быть обязательным)
      if (config.customer_number) {
        apiRequest.customerNumber = config.customer_number;
      }

      // Добавляем объявленную стоимость, если указана
      if (request.declaredValue) {
        apiRequest.edi = {
          value: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      // Endpoint Booking API для создания отправления
      // Согласно документации: POST /booking/api/create
      const response: BringBookingResponse = await this.makeRequest(
        '/booking/api/create',
        'POST',
        apiRequest
      );

      // Формат ответа Booking API
      // Bring обычно возвращает consignmentNumber как tracking number
      const trackingNumber = response.consignmentNumber || 
                             response.consignment?.consignmentNumber ||
                             response.trackingNumber || 
                             response.shipmentNumber;
      
      if (!trackingNumber) {
        throw new Error('Tracking number not received from Bring API');
      }

      // Booking ID может быть в разных полях
      const bookingId = response.consignmentId || 
                        response.bookingId || 
                        response.consignment?.consignmentId ||
                        response.shipmentId || 
                        trackingNumber;

      // URL этикетки может быть в разных полях
      const labelUrl = response.labelUrl || 
                       response.label || 
                       response.pdfUrl ||
                       response.consignment?.labelUrl;

      // QR код может быть в ответе или частью этикетки
      const qrCodeUrl = response.qrCodeUrl || 
                        response.qrCode ||
                        response.consignment?.qrCodeUrl;

      return {
        trackingNumber: trackingNumber,
        bookingId: bookingId,
        qrCodeUrl: qrCodeUrl,
        labelUrl: labelUrl,
        metadata: {
          consignmentNumber: trackingNumber,
          consignmentId: bookingId,
          ...response // Сохраняем все дополнительные данные
        }
      };
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError) {
        throw error;
      }

      // Обработка ошибок создания заказа
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        throw new ShippingBookingError(
          this.getProviderCode(),
          'Order already exists in Bring system',
          error
        );
      }

      throw new ShippingBookingError(
        this.getProviderCode(),
        error.message || 'Failed to create booking',
        error
      );
    }
  }

  /**
   * Отслеживание отправления
   * 
   * Использует Tracking API для получения статуса и истории отправления
   * Согласно документации: https://developer.bring.com/api/tracking/
   * 
   * ВАЖНО: Формат запроса и ответа основан на типичной структуре Tracking API.
   * Может потребоваться уточнение на основе реальной документации.
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // Endpoint Tracking API для получения статуса отправления
      // Согласно документации: GET /tracking/api/v2/tracking.json?q={trackingNumber}
      // Или: GET /tracking/api/v2/tracking/{trackingNumber}
      const response = await this.makeRequest(
        `/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}`,
        'GET'
      );

      // Формат ответа Tracking API может быть разным
      // Возможные варианты: response.consignment, response.shipment, response.tracking
      const trackingData = response.consignment || response.shipment || response.tracking || response;

      // Нормализация статуса в формат EverShop
      // Статус может быть в разных полях: status, currentStatus, state, statusText
      const status = this.normalizeStatus(
        trackingData.status || 
        trackingData.currentStatus || 
        trackingData.state || 
        trackingData.statusText ||
        'unknown'
      );

      // История событий может быть в разных полях: events, history, statusHistory, trackingEvents
      const events = trackingData.events || 
                     trackingData.history || 
                     trackingData.statusHistory || 
                     trackingData.trackingEvents || 
                     [];

      const history = events.map((item: any) => ({
        status: this.normalizeStatus(item.status || item.state || item.statusText || 'unknown'),
        date: item.date || item.timestamp || item.time || item.eventTime,
        location: item.location || item.address || item.city || item.place
      }));

      return {
        status: status,
        history: history.length > 0 ? history : undefined,
        metadata: {
          trackingNumber: trackingNumber,
          ...trackingData // Сохраняем все дополнительные данные
        }
      };
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError) {
        throw error;
      }

      // Обработка ошибок отслеживания (отправление не найдено)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        throw new ShippingTrackingError(
          this.getProviderCode(),
          'Shipment not found',
          error
        );
      }

      throw new ShippingTrackingError(
        this.getProviderCode(),
        error.message || 'Failed to track shipment',
        error
      );
    }
  }

  /**
   * Нормализация статуса из формата Bring в формат EverShop
   * @private
   * 
   * ВАЖНО: Статусы основаны на типичных статусах логистических API.
   * Может потребоваться уточнение на основе реальной документации Bring Tracking API.
   */
  private normalizeStatus(bringStatus: string): string {
    if (!bringStatus) {
      return 'pending';
    }

    const statusLower = bringStatus.toLowerCase();

    // Маппинг статусов Bring → EverShop
    // Статусы могут быть на норвежском или английском языке
    const statusMap: Record<string, string> = {
      // Английские статусы
      'pending': 'pending',
      'processing': 'processing',
      'in_transit': 'shipped',
      'in_transit': 'shipped',
      'out_for_delivery': 'shipped',
      'ready_for_pickup': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'canceled',
      'canceled': 'canceled',
      'failed': 'canceled',
      'exception': 'canceled',
      
      // Норвежские статусы (если Bring использует их)
      'ventende': 'pending',
      'behandles': 'processing',
      'under_vegs': 'shipped',
      'klar_for_henting': 'shipped',
      'levert': 'delivered',
      'avbrutt': 'canceled',
      'feilet': 'canceled'
    };

    const normalized = statusMap[statusLower];
    return normalized || 'pending';
  }
}

