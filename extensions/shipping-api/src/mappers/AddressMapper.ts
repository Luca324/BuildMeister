/**
 * Преобразование адресов из формата EverShop в формат провайдеров доставки
 * 
 * ПРОБЛЕМА:
 * EverShop хранит адреса в формате:
 * - address_1: "Storgata 1" (название улицы и номер вместе)
 * - address_2: опционально (дополнительная информация)
 * 
 * PostNord и другие провайдеры требуют структурированный формат:
 * - streetName: "Storgata" (отдельно)
 * - streetNumber: "1" (отдельно)
 * 
 * РЕШЕНИЕ:
 * Парсим address_1 с помощью регулярного выражения для разделения улицы и номера.
 * Если номер не найден в address_1, пытаемся извлечь его из address_2.
 * 
 * ВАЖНО:
 * - Регулярное выражение ищет паттерн: "название улицы пробел номер"
 * - Если формат адреса нестандартный, номер может быть пустым
 * - Это нормально для некоторых провайдеров, которые принимают адрес без номера
 */

import { Address } from '../adapters/types.js';

/**
 * Формат адреса в EverShop (cart_address / order_address)
 * 
 * Структура таблиц:
 * - cart_address: адреса в корзине
 * - order_address: адреса в заказе
 * 
 * Оба используют одинаковую структуру полей
 */
export interface EverShopAddress {
  full_name: string;
  postcode: string;
  telephone: string;
  country: string; // Код страны (например, "NO", "SE")
  province?: string; // Регион/провинция (опционально)
  city: string;
  address_1: string; // Основной адрес (улица + номер)
  address_2?: string; // Дополнительная информация (опционально)
}

/**
 * Преобразование адреса из формата EverShop в формат провайдера
 * 
 * Алгоритм:
 * 1. Пытаемся распарсить address_1: "Storgata 1" → streetName="Storgata", streetNumber="1"
 * 2. Если номер не найден, используем весь address_1 как streetName
 * 3. Если есть address_2, пытаемся извлечь номер оттуда
 * 4. Возвращаем структурированный адрес для API провайдера
 * 
 * @param address Адрес в формате EverShop
 * @returns Адрес в формате провайдера (структурированный)
 */
export function toProviderFormat(address: EverShopAddress): Address {
  // Парсинг address_1 для извлечения названия улицы и номера дома
  // Регулярное выражение: название улицы (любые символы) + пробел + номер (цифры и возможные буквы)
  // Примеры: "Storgata 1" → ["Storgata", "1"], "Karl Johans gate 15A" → ["Karl Johans gate", "15A"]
  const streetMatch = address.address_1.match(/^(.+?)\s+(\d+.*)$/);
  
  let streetName: string;
  let streetNumber: string;

  if (streetMatch) {
    // Успешно распарсили: есть и название улицы, и номер
    streetName = streetMatch[1].trim();
    streetNumber = streetMatch[2].trim();
  } else {
    // Номер дома не найден в address_1
    // Используем весь address_1 как название улицы
    streetName = address.address_1.trim();
    streetNumber = '';
    
    // Попытка извлечь номер из address_2, если есть
    // Например, если address_1="Storgata", address_2="1 этаж, офис 5"
    if (address.address_2) {
      const address2Match = address.address_2.match(/(\d+.*)/);
      if (address2Match) {
        streetNumber = address2Match[1].trim();
      }
    }
  }

  return {
    countryCode: address.country.toUpperCase(), // Приводим к верхнему регистру (ISO стандарт)
    postalCode: address.postcode,
    city: address.city,
    streetName: streetName,
    streetNumber: streetNumber
  };
}

/**
 * Преобразование адреса из формата провайдера в стандартный формат для API
 * 
 * Используется для преобразования адреса отправителя из конфигурации
 * в формат, который ожидают адаптеры провайдеров.
 * 
 * @param address Адрес в формате конфигурации (может быть в разных форматах)
 * @returns Адрес в стандартном формате для API
 */
export function toStandardFormat(address: any): Address {
  // Если адрес уже в правильном формате, возвращаем как есть
  if (address.countryCode && address.postalCode && address.city) {
    return {
      countryCode: address.countryCode,
      postalCode: address.postalCode,
      city: address.city,
      streetName: address.streetName || address.street_name || '',
      streetNumber: address.streetNumber || address.street_number || ''
    };
  }

  // Если адрес в формате EverShop (cart_address / order_address)
  if (address.address_1 || address.postcode) {
    return toProviderFormat(address as EverShopAddress);
  }

  // Если адрес в формате конфигурации провайдера
  return {
    countryCode: address.countryCode || address.country?.toUpperCase() || 'NO',
    postalCode: address.postalCode || address.postcode || '',
    city: address.city || address.postalName || '',
    streetName: address.streetName || address.street_name || '',
    streetNumber: address.streetNumber || address.street_number || ''
  };
}

/**
 * Класс AddressMapper для удобного использования
 */
export class AddressMapper {
  static toProviderFormat(address: EverShopAddress): Address {
    return toProviderFormat(address);
  }

  static toStandardFormat(address: any): Address {
    return toStandardFormat(address);
  }
}

