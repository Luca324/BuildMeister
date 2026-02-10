/**
 * Базовый абстрактный класс для всех адаптеров доставки
 * Определяет интерфейс, который должны реализовать все провайдеры
 */

import {
  ShippingOption,
  ShippingCalculationRequest,
  ShippingBookingRequest,
  ShippingBookingResult,
  TrackingInfo
} from './types.js';

export abstract class BaseShippingAdapter {
  /**
   * Возвращает уникальный код провайдера
   * Например: 'postnord', 'helthjem', 'bring'
   */
  abstract getProviderCode(): string;

  /**
   * Возвращает человекочитаемое название провайдера
   * Например: 'PostNord', 'Helthjem', 'Bring'
   */
  abstract getProviderName(): string;

  /**
   * Расчет стоимости доставки
   * @param request Данные для расчета (адреса, вес, габариты)
   * @returns Массив вариантов доставки с ценами
   */
  abstract calculateShipping(request: ShippingCalculationRequest): Promise<ShippingOption[]>;

  /**
   * Создание отправления в системе провайдера
   * @param request Данные заказа и выбранный вариант доставки
   * @returns Результат создания отправления (tracking number, QR код и т.д.)
   */
  abstract createBooking(request: ShippingBookingRequest): Promise<ShippingBookingResult>;

  /**
   * Отслеживание статуса отправления
   * @param trackingNumber Трек-номер отправления
   * @returns Информация о текущем статусе и истории
   */
  abstract trackShipment(trackingNumber: string): Promise<TrackingInfo>;
}

