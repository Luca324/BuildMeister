/**
 * Адаптер для интеграции с PostNord API
 * Реализует все методы базового класса для работы с PostNord
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

interface PostNordConfig {
  enabled: boolean;
  api_key: string;
  api_secret?: string;
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

interface PostNordDeliveryOption {
  deliveryOptionId: string;
  serviceCode?: string;
  serviceName?: string;
  price?: {
    amount: number;
    currency: string;
  };
  estimatedDeliveryTime?: {
    days?: number;
  };
  [key: string]: any; // Для дополнительных полей от API
}

interface PostNordBookingResponse {
  trackingNumber: string;
  bookingId?: string;
  qrCodeUrl?: string;
  labelUrl?: string;
  [key: string]: any;
}

export class PostNordAdapter extends BaseShippingAdapter {
  private config: PostNordConfig | null = null;
  private readonly API_BASE_URL = 'https://api.postnord.com'; // Sandbox URL (можно переопределить через конфиг)
  private readonly REQUEST_TIMEOUT = 15000; // 15 секунд

  constructor() {
    super();
  }

  getProviderCode(): string {
    return 'postnord';
  }

  getProviderName(): string {
    return 'PostNord';
  }

  /**
   * Получение конфигурации из SETTINGS
   * @private
   */
  private async getConfig(): Promise<PostNordConfig> {
    if (this.config) {
      return this.config;
    }

    // @ts-ignore - EverShop resolves these modules at runtime
    const { select } = await import('@evershop/postgres-query-builder');
    // @ts-ignore
    // @ts-ignore - EverShop resolves these modules at runtime
    const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
    // getConnection() returns PoolClient, pool is Pool - both work with load/execute
    const connection: any = pool || await getConnection();

    const setting = await select()
      .from('setting')
      .where('name', '=', 'shipping_api')
              .load(connection);

    if (!setting) {
      throw new Error('Shipping API configuration not found in settings');
    }

    // Парсим значение из БД (может быть JSON строка или уже объект)
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

    const providerConfig = configData?.providers?.postnord;
    if (!providerConfig) {
      throw new Error('PostNord configuration not found');
    }

    if (!providerConfig.enabled) {
      throw new Error('PostNord provider is disabled');
    }

    if (!providerConfig.api_key) {
      throw new Error('PostNord API key is not configured');
    }

    this.config = {
      enabled: providerConfig.enabled,
      api_key: providerConfig.api_key,
      api_secret: providerConfig.api_secret,
      from_address: providerConfig.from_address,
      sender_email: providerConfig.sender_email,
      api_base_url: providerConfig.api_base_url || this.API_BASE_URL
    };

    return this.config;
  }

  /**
   * Выполнение HTTP запроса к PostNord API
   * @private
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const config = await this.getConfig();
    const url = `${config.api_base_url || this.API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}` // Или другой формат авторизации PostNord
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
        throw new Error(`PostNord API error: ${response.status} ${response.statusText} - ${errorText}`);
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
   */
  async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingOption[]> {
    try {
      const config = await this.getConfig();

      const apiRequest: any = {
        fromCountryCode: request.from.countryCode,
        fromPostalCode: request.from.postalCode,
        toCountryCode: request.to.countryCode,
        toPostalCode: request.to.postalCode,
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

      const response = await this.makeRequest(
        '/api/pre-order/delivery-options',
        'POST',
        apiRequest
      );

      // Проверяем наличие deliveryOptions в ответе
      if (!response.deliveryOptions || !Array.isArray(response.deliveryOptions)) {
        // Адрес недоступен или нет вариантов доставки
        return [];
      }

      // Нормализуем варианты доставки
      const options: ShippingOption[] = response.deliveryOptions.map((option: PostNordDeliveryOption) => {
        return {
          id: option.deliveryOptionId,
          name: option.serviceName || option.serviceCode || 'PostNord Service',
          price: option.price?.amount || 0,
          currency: option.price?.currency || 'NOK',
          estimatedDays: option.estimatedDeliveryTime?.days,
          serviceCode: option.serviceCode,
          provider: this.getProviderCode(),
          metadata: {
            deliveryOptionId: option.deliveryOptionId,
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
   */
  async createBooking(request: ShippingBookingRequest): Promise<ShippingBookingResult> {
    try {
      const config = await this.getConfig();

      const apiRequest: any = {
        deliveryOptionId: request.selectedOptionId,
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
        }
      };

      // Добавляем объявленную стоимость, если указана
      if (request.declaredValue) {
        apiRequest.declaredValue = {
          amount: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      const response: PostNordBookingResponse = await this.makeRequest(
        '/api/pre-order/bookings',
        'POST',
        apiRequest
      );

      if (!response.trackingNumber) {
        throw new Error('Tracking number not received from PostNord API');
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
          'Order already exists in PostNord system',
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
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      const response = await this.makeRequest(
        `/api/tracking/shipments/${trackingNumber}`,
        'GET'
      );

      // Нормализация статуса в формат EverShop
      // Формат ответа зависит от PostNord API, нужно адаптировать под реальный формат
      const status = this.normalizeStatus(response.status || response.currentStatus);

      return {
        status: status,
        history: response.history?.map((item: any) => ({
          status: this.normalizeStatus(item.status),
          date: item.date || item.timestamp,
          location: item.location
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
   * Нормализация статуса из формата PostNord в формат EverShop
   * @private
   */
  private normalizeStatus(postnordStatus: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'pending',
      'processing': 'processing',
      'in_transit': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'canceled',
      'canceled': 'canceled'
    };

    const normalized = statusMap[postnordStatus.toLowerCase()];
    return normalized || 'pending';
  }
}

