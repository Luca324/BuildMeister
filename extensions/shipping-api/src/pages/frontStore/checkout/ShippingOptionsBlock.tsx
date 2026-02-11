/**
 * Компонент для выбора вариантов доставки на странице checkout
 * Отображает варианты от всех активных провайдеров доставки
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useClient } from 'urql';

interface ShippingOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  estimatedDays?: number;
  serviceCode?: string;
  provider: string;
  metadata?: any;
}

interface ShippingProviderOptions {
  provider: string;
  providerName: string;
  options: ShippingOption[];
  error?: string;
}

interface ShippingOptionsBlockProps {
  cart?: {
    cartId: string;
    shippingAddress?: {
      postcode?: string;
      city?: string;
      address1?: string;
      // country может быть строкой ("NO") или объектом ({ code: "NO" })
      country?: {
        code?: string;
      } | string;
      // province может быть строкой или объектом
      province?: {
        code?: string;
      } | string;
    };
    shippingMethod?: string;
  };
}

export default function ShippingOptionsBlock({ cart }: ShippingOptionsBlockProps) {
  const client = useClient();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ShippingProviderOptions[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Debounce функция для ограничения частоты вызовов API
   */
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Проверка заполненности адреса
  const isAddressComplete = useCallback((address: any) => {
    const countryCode = typeof address?.country === 'string' 
      ? address.country 
      : address?.country?.code;
    return address?.postcode && 
           address?.city && 
           address?.address1 && 
           countryCode;
  }, []);

  /**
   * Вызов GraphQL mutation для расчета стоимости доставки
   * 
   * ПРОЦЕСС:
   * 1. Вызывает mutation calculateShipping с ID корзины
   * 2. Backend загружает адрес доставки и товары из корзины
   * 3. Вызывает ShippingProviderService.calculateAll() для всех активных провайдеров
   * 4. Возвращает варианты доставки от всех провайдеров параллельно
   * 5. Отображает варианты пользователю
   * 
   * ОБРАБОТКА ОШИБОК:
   * - Если API недоступен, показываем сообщение об ошибке
   * - Если провайдер недоступен, показываем его в списке с пометкой "временно недоступен"
   * - Ошибки не блокируют отображение других провайдеров
   * 
   * СОСТОЯНИЕ:
   * - loading: показывает индикатор загрузки во время запроса
   * - error: общая ошибка (если все провайдеры недоступны)
   * - providers: массив результатов от каждого провайдера (может содержать ошибки)
   */
  const calculateShipping = useCallback(async (cartId: string) => {
    if (!cartId) return;

    setLoading(true);
    setError(null);

    try {
      // GraphQL mutation для расчета доставки
      // Вызывается на backend и возвращает варианты от всех активных провайдеров
      const CALCULATE_SHIPPING_MUTATION = `
        mutation CalculateShipping($cartId: ID!) {
          calculateShipping(cartId: $cartId) {
            provider
            providerName
            options {
              id
              name
              price
              currency
              estimatedDays
              serviceCode
              provider
            }
            error
          }
        }
      `;
      
      const result = await client.mutation(CALCULATE_SHIPPING_MUTATION, {
        cartId
      }).toPromise();

      if (result.error) {
        throw new Error(result.error.message || 'Failed to calculate shipping');
      }

      // Сохраняем результаты от всех провайдеров
      // Каждый провайдер может иметь варианты доставки или ошибку
      setProviders(result.data?.calculateShipping || []);
    } catch (err: any) {
      // Общая ошибка (например, если все провайдеры недоступны)
      setError(err.message || 'Failed to calculate shipping options');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Debounced версия calculateShipping
   * 
   * Использует useMemo для создания функции один раз и переиспользования
   */
  const debouncedCalculateShipping = useMemo(
    () => debounce(calculateShipping, 700),
    [calculateShipping, debounce]
  );

  // Отслеживание изменений адреса
  useEffect(() => {
    if (!cart?.cartId) return;
    if (!cart?.shippingAddress) return;

    if (isAddressComplete(cart.shippingAddress)) {
      // Адрес полный - вызываем API расчета доставки (с debounce)
      debouncedCalculateShipping(cart.cartId);
    } else {
      // Адрес неполный - очищаем варианты доставки
      setProviders([]);
      setSelectedOption(null);
    }
  }, [
    cart?.cartId,
    cart?.shippingAddress?.postcode,
    cart?.shippingAddress?.city,
    cart?.shippingAddress?.address1,
    typeof cart?.shippingAddress?.country === 'string' 
      ? cart.shippingAddress.country 
      : cart?.shippingAddress?.country?.code,
    typeof cart?.shippingAddress?.province === 'string'
      ? cart.shippingAddress.province
      : cart?.shippingAddress?.province?.code,
    isAddressComplete,
    debouncedCalculateShipping
  ]);

  // Сохранение выбранного варианта
  const handleSelectOption = useCallback(async (option: ShippingOption, providerName: string) => {
    if (!cart?.cartId) return;

    setSelectedOption(option.id);

    try {
      const shippingMethod = {
        method_id: option.id,
        provider: option.provider,
        option_id: option.id,
        price: option.price,
        metadata: {
          deliveryOptionId: option.id,
          serviceCode: option.serviceCode,
          estimatedDays: option.estimatedDays,
          ...option.metadata
        }
      };

      const UPDATE_CART_SHIPPING_METHOD_MUTATION = `
        mutation UpdateCartShippingMethod($cartId: ID!, $shippingMethod: JSON!) {
          updateCartShippingMethod(cartId: $cartId, shippingMethod: $shippingMethod) {
            cart {
              shippingFee {
                value
                text
              }
              grandTotal {
                value
                text
              }
            }
          }
        }
      `;

      const result = await client.mutation(UPDATE_CART_SHIPPING_METHOD_MUTATION, {
        cartId: cart.cartId,
        shippingMethod: JSON.stringify(shippingMethod)
      }).toPromise();

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update shipping method');
      }

      // Обновляем страницу для отображения новой стоимости
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to save shipping method');
      setSelectedOption(null);
    }
  }, [cart?.cartId, client]);

  // Если адрес не заполнен
  if (!cart || !cart.shippingAddress || !isAddressComplete(cart.shippingAddress)) {
    return null;
  }

  // Если нет вариантов и не загружается
  if (!loading && providers.length === 0 && !error) {
    return null;
  }

  return (
    <div className="shipping-options-block" style={{ marginTop: '20px', marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
        Доступные варианты доставки:
      </h3>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Загрузка вариантов доставки...</p>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {!loading && providers.length > 0 && (
        <div>
          {providers.map((providerResult) => (
            <div key={providerResult.provider} style={{ marginBottom: '20px' }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                marginBottom: '10px',
                color: providerResult.error ? '#c33' : '#333'
              }}>
                {providerResult.providerName}
                {providerResult.error && ' (временно недоступен)'}
              </h4>

              {providerResult.error ? (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#fee', 
                  color: '#c33',
                  borderRadius: '4px'
                }}>
                  {providerResult.error}
                </div>
              ) : (
                <div>
                  {providerResult.options.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      Доставка в этот адрес недоступна
                    </p>
                  ) : (
                    providerResult.options.map((option) => (
                      <label
                        key={option.id}
                        style={{
                          display: 'block',
                          padding: '12px',
                          marginBottom: '8px',
                          border: selectedOption === option.id ? '2px solid #007bff' : '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: selectedOption === option.id ? '#f0f8ff' : '#fff'
                        }}
                      >
                        <input
                          type="radio"
                          name="shipping-option"
                          value={option.id}
                          checked={selectedOption === option.id}
                          onChange={() => handleSelectOption(option, providerResult.providerName)}
                          style={{ marginRight: '10px' }}
                        />
                        <span style={{ fontWeight: 'bold' }}>{option.name}</span>
                        {option.estimatedDays && (
                          <span style={{ color: '#666', marginLeft: '10px' }}>
                            ({option.estimatedDays} дн.)
                          </span>
                        )}
                        <span style={{ float: 'right', fontWeight: 'bold', color: '#007bff' }}>
                          {option.price} {option.currency}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && providers.length === 0 && !error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          color: '#c33',
          borderRadius: '4px'
        }}>
          Сервисы доставки временно недоступны. Пожалуйста, попробуйте позже.
        </div>
      )}
    </div>
  );
}

ShippingOptionsBlock.propTypes = {
  cart: PropTypes.shape({
    cartId: PropTypes.string,
    shippingAddress: PropTypes.shape({
      postcode: PropTypes.string,
      city: PropTypes.string,
      address1: PropTypes.string,
      country: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          code: PropTypes.string
        })
      ]),
      province: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          code: PropTypes.string
        })
      ])
    }),
    shippingMethod: PropTypes.string
  })
};

/**
 * Регистрация компонента в системе Area EverShop
 * 
 * АВТОМАТИЧЕСКОЕ ОТОБРАЖЕНИЕ:
 * - Компонент автоматически появится на странице checkout
 * - areaId: 'checkoutShippingAddressForm' - область после формы адреса доставки
 * - sortOrder: 100 - порядок отображения (чем больше, тем ниже)
 * 
 * КАК ЭТО РАБОТАЕТ:
 * - EverShop автоматически находит все компоненты в папке pages/
 * - Проверяет наличие export const layout
 * - Добавляет компонент в указанную область (Area) на странице
 * - Не нужно вручную импортировать компонент в теме или других местах
 * 
 * ПРИМЕЧАНИЕ:
 * - Компонент будет отображаться только если cart и shippingAddress существуют
 * - Если адрес не заполнен, компонент возвращает null (не отображается)
 */
export const layout = {
  areaId: 'checkoutShippingAddressForm',
  sortOrder: 100
};

export const query = `
  query Query($cartId: String) {
    cart(id: $cartId) {
      cartId
      shippingAddress {
        postcode
        city
        address1
        country {
          code
        }
        province {
          code
        }
      }
      shippingMethod
    }
  }
`;

export const variables = `{
  cartId: getContextValue("cartId")
}`;

