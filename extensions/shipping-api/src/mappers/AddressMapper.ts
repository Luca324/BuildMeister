/**
 * Преобразование адресов из формата EverShop в формат провайдеров доставки
 */

import { Address } from '../adapters/types.js';

/**
 * Формат адреса в EverShop (cart_address / order_address)
 */
export interface EverShopAddress {
  full_name: string;
  postcode: string;
  telephone: string;
  country: string;
  province?: string;
  city: string;
  address_1: string;
  address_2?: string;
}

/**
 * Преобразование адреса из формата EverShop в формат провайдера
 * @param address Адрес в формате EverShop
 * @returns Адрес в формате провайдера
 */
export function toProviderFormat(address: EverShopAddress): Address {
  // Парсинг address_1 для извлечения названия улицы и номера дома
  const streetMatch = address.address_1.match(/^(.+?)\s+(\d+.*)$/);
  
  let streetName: string;
  let streetNumber: string;

  if (streetMatch) {
    streetName = streetMatch[1].trim();
    streetNumber = streetMatch[2].trim();
  } else {
    // Если номер дома не найден, используем весь address_1 как название улицы
    streetName = address.address_1.trim();
    streetNumber = '';
    
    // Попытка извлечь номер из address_2, если есть
    if (address.address_2) {
      const address2Match = address.address_2.match(/(\d+.*)/);
      if (address2Match) {
        streetNumber = address2Match[1].trim();
      }
    }
  }

  return {
    countryCode: address.country.toUpperCase(),
    postalCode: address.postcode,
    city: address.city,
    streetName: streetName,
    streetNumber: streetNumber
  };
}

