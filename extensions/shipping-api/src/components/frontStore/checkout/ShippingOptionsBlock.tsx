/**
 * Компонент для выбора вариантов доставки на странице checkout
 * Отображает варианты от всех активных провайдеров доставки
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

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
      country?: string;
      province?: string;
    };
    shippingMethod?: string;
  };
}

export default function ShippingOptionsBlock({ cart }: ShippingOptionsBlockProps) {
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ShippingProviderOptions[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce функция
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Проверка заполненности адреса
  const isAddressComplete = useCallback((address: any) => {
    return address?.postcode && 
           address?.city && 
           address?.address1 && 
           address?.country;
  }, []);

  // Вызов API расчета доставки
  const calculateShipping = useCallback(async (cartId: string) => {
    if (!cartId) return;

    setLoading(true);
    setError(null);

    try {
      // @ts-ignore - GraphQL client resolved at runtime
      const { graphql } = await import('@evershop/evershop/lib/graphql');
      
      const result = await graphql(`
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
      `, {
        cartId
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to calculate shipping');
      }

      setProviders(result.data?.calculateShipping || []);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate shipping options');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced версия calculateShipping
  const debouncedCalculateShipping = useMemo(
    () => debounce(calculateShipping, 700),
    [calculateShipping, debounce]
  );

  // Отслеживание изменений адреса
  useEffect(() => {
    if (!cart?.cartId) return;
    if (!cart?.shippingAddress) return;

    if (isAddressComplete(cart.shippingAddress)) {
      debouncedCalculateShipping(cart.cartId);
    } else {
      setProviders([]);
      setSelectedOption(null);
    }
  }, [
    cart?.cartId,
    cart?.shippingAddress?.postcode,
    cart?.shippingAddress?.city,
    cart?.shippingAddress?.address1,
    cart?.shippingAddress?.country,
    cart?.shippingAddress?.province,
    isAddressComplete,
    debouncedCalculateShipping
  ]);

  // Загрузка при монтировании, если адрес уже заполнен
  useEffect(() => {
    if (cart?.cartId && cart?.shippingAddress && isAddressComplete(cart.shippingAddress)) {
      calculateShipping(cart.cartId);
    }
  }, []); // Только при монтировании

  // Сохранение выбранного варианта
  const handleSelectOption = useCallback(async (option: ShippingOption, providerName: string) => {
    if (!cart?.cartId) return;

    setSelectedOption(option.id);

    try {
      // @ts-ignore - GraphQL client resolved at runtime
      const { graphql } = await import('@evershop/evershop/lib/graphql');

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

      const result = await graphql(`
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
      `, {
        cartId: cart.cartId,
        shippingMethod: JSON.stringify(shippingMethod)
      });

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to update shipping method');
      }

      // Обновляем страницу для отображения новой стоимости
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to save shipping method');
      setSelectedOption(null);
    }
  }, [cart?.cartId]);

  // Если адрес не заполнен
  if (!cart?.shippingAddress || !isAddressComplete(cart.shippingAddress)) {
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
      country: PropTypes.string,
      province: PropTypes.string
    }),
    shippingMethod: PropTypes.string
  })
};

// Регистрация компонента в системе Area для автоматического отображения на странице checkout
export const layout = {
  areaId: 'checkoutShippingMethods', // Или другой подходящий areaId для checkout страницы
  sortOrder: 50
};

