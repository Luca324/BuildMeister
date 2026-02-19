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
  customer_number?: string; // Номер клиента в системе Bring (обязателен для Booking API)
  from_address: {
    countryCode: string;
    postalCode: string;
    city: string;
    streetName: string;
    streetNumber: string;
  };
  sender_email: string;
  sender_name?: string; // Имя отправителя
  sender_phone?: string; // Телефон отправителя
  test_mode?: boolean; // Режим тестирования для Booking API
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
      sender_name: providerConfig.sender_name,
      sender_phone: providerConfig.sender_phone,
      test_mode: providerConfig.test_mode !== undefined ? providerConfig.test_mode : false,
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
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<any> {
    const config = await this.getConfig();
    const url = `${config.api_base_url || this.API_BASE_URL}${endpoint}`;

    // Формат авторизации Bring API согласно документации:
    // Требуются заголовки: X-Mybring-API-Uid, X-Mybring-API-Key
    // X-Bring-Client-URL может требоваться для некоторых API (например, Booking API)
    // Accept заголовок для указания формата ответа (JSON)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Mybring-API-Uid': config.api_uid, // Email пользователя Mybring
      'X-Mybring-API-Key': config.api_key  // API ключ
    };

    // Добавляем X-Bring-Client-URL для API, которые его требуют (например, Booking API, Tracking API)
    if (config.client_url) {
      headers['X-Bring-Client-URL'] = config.client_url;
    }

    // Добавляем дополнительные заголовки (например, X-Bring-Test-Indicator для Booking API)
    if (additionalHeaders) {
      Object.assign(headers, additionalHeaders);
    }

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
   * Согласно документации: https://api.bring.com/shippingguide/api-docs
   * 
   * Формат запроса согласно OpenAPI спецификации:
   * - consignments: массив с информацией о посылках
   * - packages: массив с весом в граммах и габаритами
   * - products: массив с ID продуктов (опционально, если не указан - вернутся все доступные)
   * - withPrice: true для получения цен
   * - withExpectedDelivery: true для получения сроков доставки
   * - withGuiInformation: true для получения названий и описаний
   */
  async calculateShipping(request: ShippingCalculationRequest): Promise<ShippingOption[]> {
    try {
      const config = await this.getConfig();

      // Формат запроса для Shipping Guide API v2 согласно OpenAPI спецификации
      // Вес указывается в граммах в массиве packages
      const apiRequest: any = {
        consignments: [
          {
            fromCountryCode: request.from.countryCode,
            fromPostalCode: request.from.postalCode,
            toCountryCode: request.to.countryCode,
            toPostalCode: request.to.postalCode,
            packages: [
              {
                grossWeight: Math.round(request.weight * 1000), // Конвертируем кг в граммы
                // Габариты в см (опционально, но рекомендуется для точного расчета цены)
                ...(request.dimensions.length && request.dimensions.width && request.dimensions.height ? {
                  length: request.dimensions.length,
                  width: request.dimensions.width,
                  height: request.dimensions.height
                } : {})
              }
            ],
            // products: [] - если не указан, вернутся все доступные продукты
          }
        ],
        withPrice: true,
        withExpectedDelivery: true,
        withGuiInformation: true,
        language: 'NO', // Норвежский язык для названий и описаний
        edi: false,
        postingAtPostoffice: false,
        trace: false
      };

      // Добавляем customer number в products, если указан (для получения согласованных цен)
      if (config.customer_number) {
        apiRequest.consignments[0].products = [
          {
            id: null, // null означает все доступные продукты
            customerNumber: config.customer_number
          }
        ];
      }

      // Добавляем объявленную стоимость (EDI), если указана
      if (request.declaredValue) {
        apiRequest.edi = {
          value: request.declaredValue.amount,
          currency: request.declaredValue.currency
        };
      }

      // Endpoint Shipping Guide API v2
      const response = await this.makeRequest(
        '/shippingguide/api/v2/products',
        'POST',
        apiRequest
      );

      // Формат ответа согласно OpenAPI спецификации:
      // response.consignments[].products[] - массив продуктов с ценами и сроками
      let products: any[] = [];
      
      if (response.consignments && Array.isArray(response.consignments)) {
        // Извлекаем продукты из каждого consignment
        products = response.consignments.flatMap((consignment: any) => {
          if (!consignment.products || !Array.isArray(consignment.products)) {
            return [];
          }
          // Фильтруем продукты с ошибками (оставляем только валидные)
          return consignment.products.filter((product: any) => 
            !product.errors || product.errors.length === 0
          );
        });
      }

      if (products.length === 0) {
        // Адрес недоступен или нет вариантов доставки
        return [];
      }

      // Нормализуем варианты доставки
      const options: ShippingOption[] = products.map((product: any) => {
        // Product ID (код продукта Bring)
        const productId = product.id || product.productionCode;
        
        // Название продукта из guiInformation или id
        const guiInfo = product.guiInformation || {};
        const productName = guiInfo.displayName || guiInfo.name || productId || 'Bring Service';
        
        // Извлекаем цену
        // Bring возвращает: price.listPrice (розничная), price.netPrice (согласованная), price.withVAT (с НДС)
        const priceObj = product.price || {};
        // Используем согласованную цену, если доступна, иначе розничную
        const price = priceObj.netPrice || priceObj.listPrice || priceObj.withVAT || 0;
        const currency = priceObj.currency || 'NOK';

        // Извлекаем срок доставки из expectedDelivery
        let estimatedDays: number | undefined;
        const expectedDelivery = product.expectedDelivery;
        
        if (expectedDelivery) {
          // expectedDelivery может быть объектом с датой или строкой
          const deliveryDate = expectedDelivery.date || expectedDelivery.expectedDeliveryDate || expectedDelivery;
          if (deliveryDate) {
            const delivery = new Date(deliveryDate);
            const today = new Date();
            const diffTime = delivery.getTime() - today.getTime();
            estimatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Если дата в прошлом или сегодня, устанавливаем минимум 1 день
            if (estimatedDays < 1) {
              estimatedDays = 1;
            }
          } else if (expectedDelivery.workingDays) {
            estimatedDays = expectedDelivery.workingDays;
          }
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
            productionCode: product.productionCode,
            customerNumber: product.customerNumber,
            guiInformation: guiInfo,
            expectedDelivery: expectedDelivery,
            warnings: product.warnings || [],
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

      // Обработка ошибок валидации адреса на основе кодов ошибок Bring API
      const errorMessage = error.message || '';
      if (errorMessage.includes('OUTSIDE_COVERAGE_AREA') ||
          errorMessage.includes('INVALID_COUNTRY_PAIR') ||
          errorMessage.includes('CUSTOMER_NOT_FOUND') ||
          errorMessage.includes('CUSTOMER_FORBIDDEN') ||
          errorMessage.includes('invalid') || 
          errorMessage.includes('address') ||
          errorMessage.includes('not found') || 
          errorMessage.includes('unavailable') ||
          errorMessage.includes('not available')) {
        throw new ShippingAddressInvalidError(this.getProviderCode(), errorMessage);
      }

      throw new ShippingProviderUnavailableError(this.getProviderCode(), error);
    }
  }

  /**
   * Создание отправления
   * 
   * Использует Booking API для создания отправления
   * Согласно документации: https://api.bring.com/booking/api-docs
   * 
   * Формат запроса согласно OpenAPI спецификации:
   * - schemaVersion: 1
   * - consignments: массив с информацией о посылке
   * - shippingDateTime: дата и время готовности к отправке
   * - product.id: код продукта (из выбранного варианта доставки)
   * - product.customerNumber: номер клиента (обязателен)
   * - parties.sender и parties.recipient: адреса и контакты
   * - packages: массив с весом, габаритами и описанием товара
   */
  async createBooking(request: ShippingBookingRequest): Promise<ShippingBookingResult> {
    try {
      const config = await this.getConfig();

      if (!config.customer_number) {
        throw new Error('Bring customer number is required for booking');
      }

      // Формат запроса для Booking API согласно OpenAPI спецификации
      // Product ID извлекаем из selectedOptionId (это ID продукта Bring)
      const productId = request.selectedOptionId;

      // Формируем адрес отправителя из конфигурации
      const senderAddressLine = `${config.from_address.streetName} ${config.from_address.streetNumber}`.trim();

      // Формируем адрес получателя
      const recipientAddressLine = `${request.to.streetName} ${request.to.streetNumber}`.trim();

      const apiRequest: any = {
        schemaVersion: 1,
        consignments: [
          {
            shippingDateTime: new Date().toISOString(), // Текущая дата и время готовности к отправке
            product: {
              id: productId,
              customerNumber: config.customer_number
            },
            correlationId: request.orderNumber || `ORDER-${Date.now()}`, // Для связи с заказом
            parties: {
              sender: {
                name: config.sender_name || 'Sender',
                addressLine: senderAddressLine,
                addressLine2: null,
                postalCode: config.from_address.postalCode,
                city: config.from_address.city,
                countryCode: config.from_address.countryCode,
                reference: request.orderNumber || '',
                contact: {
                  name: config.sender_name || 'Sender Contact',
                  email: config.sender_email,
                  phoneNumber: config.sender_phone || '+4712345678' // Телефон обязателен для большинства продуктов
                }
              },
              recipient: {
                name: request.recipient.name,
                addressLine: recipientAddressLine,
                addressLine2: null,
                postalCode: request.to.postalCode,
                city: request.to.city,
                countryCode: request.to.countryCode,
                reference: request.orderNumber || null,
                contact: {
                  name: request.recipient.name,
                  email: request.recipient.email || null,
                  phoneNumber: request.recipient.phone || null
                }
              },
              pickupPoint: null // Можно добавить поддержку pickup point в будущем
            },
            packages: [
              {
                weightInKg: request.weight,
                goodsDescription: request.goodsDescription || null,
                dimensions: {
                  heightInCm: Math.round(request.dimensions.height),
                  widthInCm: Math.round(request.dimensions.width),
                  lengthInCm: Math.round(request.dimensions.length)
                },
                volumeInDm3: request.dimensions.length * request.dimensions.width * request.dimensions.height / 1000, // Конвертируем см³ в дм³
                containerId: null,
                packageType: null,
                correlationId: request.orderNumber || null
              }
            ]
          }
        ]
      };

      // Endpoint Booking API для создания отправления
      // Согласно документации: POST /booking/api/create
      // Обязательный заголовок X-Bring-Test-Indicator (true для теста, false для продакшена)
      const response: any = await this.makeRequest(
        '/booking/api/create',
        'POST',
        apiRequest,
        {
          'X-Bring-Test-Indicator': config.test_mode ? 'true' : 'false'
        }
      );

      // Формат ответа Booking API согласно OpenAPI спецификации:
      // response.consignments[].confirmation.consignmentNumber - tracking number
      // response.consignments[].confirmation.links.labels - URL этикетки
      // response.consignments[].confirmation.packages[].packageNumber - номер посылки
      // response.consignments[].confirmation.packages[].qrCodeLink - URL QR кода (если запрошен)
      
      if (!response.consignments || !Array.isArray(response.consignments) || response.consignments.length === 0) {
        throw new Error('Invalid response from Bring Booking API');
      }

      const consignment = response.consignments[0];

      // Проверяем наличие ошибок
      if (consignment.errors && Array.isArray(consignment.errors) && consignment.errors.length > 0) {
        const errorMessages = consignment.errors.map((err: any) => 
          err.messages?.map((msg: any) => msg.message).join(', ') || err.code
        ).join('; ');
        throw new Error(`Bring Booking API errors: ${errorMessages}`);
      }

      if (!consignment.confirmation) {
        throw new Error('No confirmation received from Bring Booking API');
      }

      const confirmation = consignment.confirmation;
      const trackingNumber = confirmation.consignmentNumber;
      
      if (!trackingNumber) {
        throw new Error('Tracking number not received from Bring API');
      }

      // URL этикетки из links.labels
      const labelUrl = confirmation.links?.labels || null;

      // QR код из packages[].qrCodeLink (если запрошен)
      const qrCodeUrl = confirmation.packages?.[0]?.qrCodeLink || null;

      // Booking ID (используем consignmentNumber как ID)
      const bookingId = trackingNumber;

      return {
        trackingNumber: trackingNumber,
        bookingId: bookingId,
        qrCodeUrl: qrCodeUrl,
        labelUrl: labelUrl,
        metadata: {
          consignmentNumber: trackingNumber,
          consignmentId: bookingId,
          packageNumbers: confirmation.packages?.map((pkg: any) => pkg.packageNumber) || [],
          expectedDelivery: confirmation.dateAndTimes?.expectedDelivery || null,
          ...confirmation // Сохраняем все дополнительные данные
        }
      };
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError) {
        throw error;
      }

      // Обработка ошибок создания заказа на основе кодов ошибок Bring API
      const errorMessage = error.message || '';
      if (errorMessage.includes('BOOK-INPUT-') || 
          errorMessage.includes('BOOK-VALIDATION-') ||
          errorMessage.includes('BOOK-AUTHORIZATION-')) {
        throw new ShippingBookingError(
          this.getProviderCode(),
          errorMessage,
          error
        );
      }

      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        throw new ShippingBookingError(
          this.getProviderCode(),
          'Order already exists in Bring system',
          error
        );
      }

      throw new ShippingBookingError(
        this.getProviderCode(),
        errorMessage || 'Failed to create booking',
        error
      );
    }
  }

  /**
   * Отслеживание отправления
   * 
   * Использует Tracking API для получения статуса и истории отправления
   * Согласно документации: https://api.bring.com/tracking/api-docs
   * 
   * Формат запроса согласно OpenAPI спецификации:
   * - GET /api/v2/tracking.json?q={trackingNumber}
   * - Заголовки: X-Mybring-API-Uid, X-Mybring-API-Key, X-Bring-Client-URL
   * 
   * Формат ответа:
   * - response.consignmentSet[] - массив consignments
   * - consignment.packageSet[].eventSet[] - массив событий с статусами
   * - consignment.packageSet[].statusDescription - описание текущего статуса
   */
  async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // Endpoint Tracking API согласно OpenAPI спецификации
      // GET /api/v2/tracking.json?q={trackingNumber}
      const response = await this.makeRequest(
        `/tracking/api/v2/tracking.json?q=${encodeURIComponent(trackingNumber)}`,
        'GET'
      );

      // Формат ответа Tracking API согласно OpenAPI спецификации:
      // response.consignmentSet[] - массив consignments или ошибок
      if (!response.consignmentSet || !Array.isArray(response.consignmentSet) || response.consignmentSet.length === 0) {
        throw new ShippingTrackingError(
          this.getProviderCode(),
          'No tracking data found',
          new Error('Empty consignmentSet')
        );
      }

      const consignmentElement = response.consignmentSet[0];

      // Проверяем наличие ошибки (TraceStatusType)
      if (consignmentElement.error) {
        const errorCode = consignmentElement.error.code;
        const errorMessage = consignmentElement.error.message || 'Unknown error';
        
        if (errorCode === 404) {
          throw new ShippingTrackingError(
            this.getProviderCode(),
            'Shipment not found',
            new Error(errorMessage)
          );
        }
        
        throw new ShippingTrackingError(
          this.getProviderCode(),
          `Tracking error: ${errorMessage}`,
          new Error(`Code: ${errorCode}`)
        );
      }

      // Извлекаем данные из PackageCargoConsignmentType
      const consignment = consignmentElement;
      
      if (!consignment.packageSet || !Array.isArray(consignment.packageSet) || consignment.packageSet.length === 0) {
        throw new ShippingTrackingError(
          this.getProviderCode(),
          'No package data found',
          new Error('Empty packageSet')
        );
      }

      // Берем первую посылку (обычно одна)
      const packageData = consignment.packageSet[0];

      // Извлекаем события из eventSet
      const events = packageData.eventSet || [];
      
      // Определяем текущий статус из последнего события или statusDescription
      let currentStatus = 'pending';
      if (events.length > 0) {
        // Берем статус из последнего события (самое свежее)
        const lastEvent = events[0]; // События обычно отсортированы от новых к старым
        currentStatus = this.normalizeStatus(lastEvent.status || 'unknown');
      } else if (packageData.statusDescription) {
        // Если нет событий, пытаемся определить статус из описания
        const statusDesc = packageData.statusDescription.toLowerCase();
        if (statusDesc.includes('delivered') || statusDesc.includes('levert')) {
          currentStatus = 'delivered';
        } else if (statusDesc.includes('pickup') || statusDesc.includes('henting')) {
          currentStatus = 'shipped';
        } else if (statusDesc.includes('transit') || statusDesc.includes('vegs')) {
          currentStatus = 'shipped';
        }
      }

      // Формируем историю событий
      const history = events
        .filter((event: any) => !event.insignificant) // Фильтруем незначимые события
        .map((event: any) => ({
          status: this.normalizeStatus(event.status || 'unknown'),
          date: event.dateIso || event.displayDate || null,
          location: event.city 
            ? `${event.city}${event.postalCode ? ` (${event.postalCode})` : ''}${event.country ? `, ${event.country}` : ''}`
            : null,
          description: event.description || null
        }));

      return {
        status: currentStatus,
        history: history.length > 0 ? history : undefined,
        metadata: {
          trackingNumber: trackingNumber,
          consignmentId: consignment.consignmentId || null,
          packageNumber: packageData.packageNumber || null,
          productName: packageData.productName || null,
          productCode: packageData.productCode || null,
          statusDescription: packageData.statusDescription || null,
          ...consignment // Сохраняем все дополнительные данные
        }
      };
    } catch (error: any) {
      if (error instanceof ShippingProviderTimeoutError || 
          error instanceof ShippingProviderUnavailableError ||
          error instanceof ShippingTrackingError) {
        throw error;
      }

      // Обработка ошибок отслеживания
      const errorMessage = error.message || '';
      if (errorMessage.includes('404') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('No shipments found')) {
        throw new ShippingTrackingError(
          this.getProviderCode(),
          'Shipment not found',
          error
        );
      }

      throw new ShippingTrackingError(
        this.getProviderCode(),
        errorMessage || 'Failed to track shipment',
        error
      );
    }
  }

  /**
   * Нормализация статуса из формата Bring в формат EverShop
   * @private
   * 
   * Статусы согласно OpenAPI спецификации Bring Tracking API:
   * - PRE_NOTIFIED: Уведомление получено, посылка еще не получена
   * - IN_TRANSIT: В пути
   * - TRANSPORT_TO_RECIPIENT: Загружено для доставки
   * - READY_FOR_PICKUP: Готово к получению в пункте выдачи
   * - DELIVERED: Доставлено
   * - NOTIFICATION_SENT: Уведомление отправлено
   */
  private normalizeStatus(bringStatus: string): string {
    if (!bringStatus) {
      return 'pending';
    }

    const statusUpper = bringStatus.toUpperCase();

    // Маппинг статусов Bring → EverShop согласно OpenAPI спецификации
    const statusMap: Record<string, string> = {
      // Статусы из Bring Tracking API
      'PRE_NOTIFIED': 'pending', // Уведомление получено, посылка еще не получена
      'IN_TRANSIT': 'shipped', // В пути
      'TRANSPORT_TO_RECIPIENT': 'shipped', // Загружено для доставки
      'READY_FOR_PICKUP': 'shipped', // Готово к получению в пункте выдачи
      'DELIVERED': 'delivered', // Доставлено
      'NOTIFICATION_SENT': 'processing', // Уведомление отправлено
      
      // Дополнительные статусы (на случай изменений в API)
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'SHIPPED': 'shipped',
      'CANCELLED': 'canceled',
      'CANCELED': 'canceled',
      'FAILED': 'canceled',
      'EXCEPTION': 'canceled'
    };

    const normalized = statusMap[statusUpper];
    return normalized || 'pending';
  }
}

