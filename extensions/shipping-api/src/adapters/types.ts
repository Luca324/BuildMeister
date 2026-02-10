/**
 * Типы и интерфейсы для адаптеров доставки
 */

export interface Address {
  countryCode: string;
  postalCode: string;
  city: string;
  streetName: string;
  streetNumber: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimatedDays?: number;
  serviceCode?: string;
  provider: string;
  metadata?: Record<string, any>;
}

export interface ShippingCalculationRequest {
  from: Address;
  to: Address;
  weight: number; // кг
  dimensions: {
    length: number; // см
    width: number; // см
    height: number; // см
  };
  declaredValue?: {
    amount: number;
    currency: string;
  };
}

export interface ShippingBookingRequest extends ShippingCalculationRequest {
  selectedOptionId: string;
  orderId: string;
  orderNumber: string;
  recipient: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface ShippingBookingResult {
  trackingNumber: string;
  bookingId?: string;
  qrCodeUrl?: string;
  labelUrl?: string;
  metadata?: Record<string, any>;
}

export interface TrackingInfo {
  status: string;
  history?: Array<{
    status: string;
    date: string;
    location?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Классы ошибок для обработки различных сценариев
 */
export class ShippingProviderError extends Error {
  constructor(message: string, public readonly providerCode: string) {
    super(message);
    this.name = 'ShippingProviderError';
  }
}

export class ShippingProviderUnavailableError extends ShippingProviderError {
  constructor(providerCode: string, public readonly originalError?: Error) {
    super(`Shipping provider ${providerCode} is temporarily unavailable`, providerCode);
    this.name = 'ShippingProviderUnavailableError';
  }
}

export class ShippingProviderTimeoutError extends ShippingProviderError {
  constructor(providerCode: string) {
    super(`Request to ${providerCode} timed out`, providerCode);
    this.name = 'ShippingProviderTimeoutError';
  }
}

export class ShippingAddressInvalidError extends ShippingProviderError {
  constructor(providerCode: string, message: string) {
    super(`Invalid address for ${providerCode}: ${message}`, providerCode);
    this.name = 'ShippingAddressInvalidError';
  }
}

export class ShippingBookingError extends ShippingProviderError {
  constructor(providerCode: string, message: string, public readonly originalError?: Error) {
    super(`Failed to create booking in ${providerCode}: ${message}`, providerCode);
    this.name = 'ShippingBookingError';
  }
}

export class ShippingTrackingError extends ShippingProviderError {
  constructor(providerCode: string, message: string, public readonly originalError?: Error) {
    super(`Failed to track shipment in ${providerCode}: ${message}`, providerCode);
    this.name = 'ShippingTrackingError';
  }
}

