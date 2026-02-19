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
  api_key: string;
  api_secret?: string;
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
  // TODO: Уточнить базовый URL Bring API из документации
  private readonly API_BASE_URL = 'https://api.bring.com'; // Примерный URL, нужно уточнить
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

    this.config = {
      enabled: providerConfig.enabled,
      api_key: providerConfig.api_key,
      api_secret: providerConfig.api_secret,
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

    // TODO: Уточнить формат авторизации Bring API из документации
    // Возможные варианты:
    // - Bearer token: Authorization: Bearer {api_key}
    // - Basic Auth: Authorization: Basic {base64(api_key:api_secret)}
    // - API key в заголовке: X-API-Key: {api_key}
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Пример авторизации через Bearer token (нужно уточнить)
    if (config.api_key) {
      headers['Authorization'] = `Bearer ${config.api_key}`;
    }

    // Если требуется Basic Auth (нужно уточнить)
    // if (config.api_key && config.api_secret) {
    //   const credentials = Buffer.from(`${config.api_key}:${config.api_secret}`).toString('base64');
    //   headers['Authorization'] = `Basic ${credentials}`;
    // }

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
   * TODO: Заполнить на основе реальной документации Bring API
   * Нужно уточнить:
   * - Точный endpoint для расчета стоимости
   * - Формат запроса (адреса, вес, габариты)
   * - Формат ответа (варианты доставки с ценами)
   */
  async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingOption[]> {
    try {
      const config = await this.getConfig();

      // TODO: Адаптировать под реальный формат запроса Bring API
      // Примерная структура на основе типичных API доставки:
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
        weight: {
          value: request.weight,
          unit: 'kg'
        },
        dimensions: {
          length: request.dimensions.length,
          width: request.dimensions.width,
          height: request.dimensions.height,
          unit: 'cm'
        }
      };

      // Добавляем объявленную стоимость, если указана
      if (request.declaredValue) {
        apiRequest.declaredValue = {
          amount: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      // TODO: Заменить на реальный endpoint Bring API
      // Пример: '/api/shipping/calculate' или '/api/guide/calculate'
      const response = await this.makeRequest(
        '/api/shipping/calculate', // TODO: Уточнить endpoint
        'POST',
        apiRequest
      );

      // TODO: Адаптировать под реальный формат ответа Bring API
      // Проверяем наличие вариантов доставки в ответе
      if (!response.deliveryOptions || !Array.isArray(response.deliveryOptions)) {
        // Возможно, формат ответа другой - нужно уточнить из документации
        // Например: response.services, response.options, response.products и т.д.
        return [];
      }

      // Нормализуем варианты доставки
      const options: ShippingOption[] = response.deliveryOptions.map((option: BringDeliveryOption) => {
        return {
          id: option.serviceId || `bring_${Date.now()}_${Math.random()}`,
          name: option.serviceName || 'Bring Service',
          price: option.price?.amount || 0,
          currency: option.price?.currency || 'NOK',
          estimatedDays: option.estimatedDays,
          serviceCode: option.serviceId,
          provider: this.getProviderCode(),
          metadata: {
            serviceId: option.serviceId,
            ...option // Сохраняем все дополнительные данные от API
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
      if (error.message?.includes('invalid') || error.message?.includes('address')) {
        throw new ShippingAddressInvalidError(this.getProviderCode(), error.message);
      }

      throw new ShippingProviderUnavailableError(this.getProviderCode(), error);
    }
  }

  /**
   * Создание отправления
   * 
   * TODO: Заполнить на основе реальной документации Bring API
   * Нужно уточнить:
   * - Точный endpoint для создания отправления
   * - Формат запроса (адреса, получатель, товары)
   * - Формат ответа (tracking number, QR код, label)
   */
  async createBooking(request: ShippingBookingRequest): Promise<ShippingBookingResult> {
    try {
      const config = await this.getConfig();

      // TODO: Адаптировать под реальный формат запроса Bring API
      const apiRequest: any = {
        serviceId: request.selectedOptionId, // Или другой способ передачи выбранного варианта
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
        weight: {
          value: request.weight,
          unit: 'kg'
        },
        dimensions: {
          length: request.dimensions.length,
          width: request.dimensions.width,
          height: request.dimensions.height,
          unit: 'cm'
        },
        orderReference: request.orderNumber // Для связи с заказом в системе
      };

      // Добавляем объявленную стоимость, если указана
      if (request.declaredValue) {
        apiRequest.declaredValue = {
          amount: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      // TODO: Заменить на реальный endpoint Bring API
      // Пример: '/api/shipping/book' или '/api/booking/create'
      const response: BringBookingResponse = await this.makeRequest(
        '/api/shipping/book', // TODO: Уточнить endpoint
        'POST',
        apiRequest
      );

      if (!response.trackingNumber) {
        throw new Error('Tracking number not received from Bring API');
      }

      return {
        trackingNumber: response.trackingNumber,
        bookingId: response.bookingId,
        qrCodeUrl: response.qrCodeUrl,
        labelUrl: response.labelUrl,
        metadata: {
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
   * TODO: Заполнить на основе реальной документации Bring API
   * Нужно уточнить:
   * - Точный endpoint для отслеживания
   * - Формат запроса (tracking number)
   * - Формат ответа (статус, история событий)
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // TODO: Заменить на реальный endpoint Bring API
      // Пример: `/api/tracking/${trackingNumber}` или `/api/shipment/${trackingNumber}/status`
      const response = await this.makeRequest(
        `/api/tracking/${trackingNumber}`, // TODO: Уточнить endpoint
        'GET'
      );

      // TODO: Адаптировать под реальный формат ответа Bring API
      // Нормализация статуса в формат EverShop
      const status = this.normalizeStatus(response.status || response.currentStatus || response.state);

      return {
        status: status,
        history: response.history?.map((item: any) => ({
          status: this.normalizeStatus(item.status || item.state),
          date: item.date || item.timestamp || item.time,
          location: item.location || item.address
        })),
        metadata: response
      };
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError) {
        throw error;
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
   * TODO: Уточнить реальные статусы Bring API из документации
   */
  private normalizeStatus(bringStatus: string): string {
    // TODO: Адаптировать под реальные статусы Bring API
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'processing': 'processing',
      'in_transit': 'shipped',
      'out_for_delivery': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'canceled',
      'canceled': 'canceled',
      'failed': 'canceled'
    };

    const normalized = statusMap[bringStatus?.toLowerCase() || ''];
    return normalized || 'pending';
  }
}

