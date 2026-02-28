/**
 * Компонент для выбора вариантов доставки на странице checkout
 * Отображает варианты от всех активных провайдеров доставки
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
// @ts-ignore - резолвится из ядра при сборке
import { useFormContext } from '@components/common/form/Form';
// @ts-ignore
import { useCheckoutStepsDispatch } from '@components/common/context/checkoutSteps';

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
    addAddressApi?: string;
    shippingMethodMetadata?: string;
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

/** Объект метода доставки для сохранения в корзине при переходе к оплате */
interface SelectedMethodData {
  option: ShippingOption;
  providerName: string;
}

export default function ShippingOptionsBlock({ cart }: ShippingOptionsBlockProps) {
  const formContext = useFormContext?.() ?? null;
  const { completeStep } = useCheckoutStepsDispatch?.() ?? {};
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<ShippingProviderOptions[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedMethodData, setSelectedMethodData] = useState<SelectedMethodData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didPersistRef = useRef(false);

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
  const calculateShipping = useCallback(async (cartId: string, addressFromForm?: {
    postcode: string; city: string; address1: string; country: string;
    fullName?: string; telephone?: string; province?: string;
  } | null) => {
    if (!cartId) return;

    setLoading(true);
    setError(null);

    const addressVar = addressFromForm ? {
      postcode: addressFromForm.postcode,
      city: addressFromForm.city,
      address1: addressFromForm.address1,
      country: addressFromForm.country,
      fullName: addressFromForm.fullName ?? '',
      telephone: addressFromForm.telephone ?? '',
      province: addressFromForm.province ?? null
    } : null;

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation CalculateShipping($cartId: ID!, $address: JSON) {
              calculateShipping(cartId: $cartId, address: $address) {
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
          `,
          variables: {
            cartId,
            address: addressVar
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SHIPPING-API] GraphQL request failed:', response.status, errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('[SHIPPING-API] GraphQL errors:', result.errors);
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

  // Расчёт по полям адреса в форме (до сохранения в корзину), с debounce при изменении любого поля
  const formFields = formContext?.fields ?? [];
  const getForm = (name: string) => formFields.find((f: { name?: string }) => f.name === name)?.value;
  const formPostcode = getForm('address[postcode]');
  const formCity = getForm('address[city]');
  const formAddress1 = getForm('address[address_1]');
  const formCountry = getForm('address[country]');
  const formAddressKey = [formPostcode, formCity, formAddress1, formCountry].filter(Boolean).join('|');

  useEffect(() => {
    if (!cart?.cartId) return;
    if (!formContext) {
      return;
    }
    if (!formPostcode || !formCity || !formAddress1 || !formCountry) {
      setProviders([]);
      setSelectedOption(null);
      return;
    }
    console.log('[SHIPPING-API] Расчёт по форме адреса', { cartId: cart.cartId, formAddressKey: formAddressKey.substring(0, 50) });
    debouncedCalculateShipping(cart.cartId, {
      postcode: String(formPostcode),
      city: String(formCity),
      address1: String(formAddress1),
      country: String(formCountry),
      fullName: getForm('address[full_name]') as string | undefined,
      telephone: getForm('address[telephone]') as string | undefined,
      province: getForm('address[province]') as string | undefined
    });
  }, [cart?.cartId, debouncedCalculateShipping, formAddressKey]);

  // Синхронизация с выбранным методом при монтировании (из корзины).
  // План «без патча»: при выборе Bring в cart.shippingMethod — UUID, полный объект в cart.shippingMethodMetadata
  useEffect(() => {
    const raw = cart?.shippingMethodMetadata ?? cart?.shippingMethod;
    if (!raw) return;
    try {
      const method = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (method.provider && method.metadata?.deliveryOptionId) {
        const id = method.metadata.deliveryOptionId;
        setSelectedOption(id);
        setSelectedMethodData({
          option: {
            id,
            name: method.name || method.shipping_method_name || 'Bring',
            price: method.costInclTax ?? method.price ?? method.cost ?? 0,
            currency: 'NOK',
            provider: method.provider,
            ...method.metadata
          },
          providerName: method.provider
        });
      }
    } catch (_) {}
  }, [cart?.shippingMethod, cart?.shippingMethodMetadata]);

  // Сброс выбора Bring, если в форме выбран нативный метод (одна radio group)
  const methodFieldValue = formFields.find((f: { name?: string }) => f.name === 'method')?.value;
  useEffect(() => {
    if (methodFieldValue != null && typeof methodFieldValue === 'string' && !methodFieldValue.startsWith('api_bring_')) {
      setSelectedOption(null);
      setSelectedMethodData(null);
    }
  }, [methodFieldValue]);

  /** Сохраняет выбранный метод Bring в корзину через GraphQL (вызывается при выборе и/или при сабмите). */
  const persistShippingMethodToCart = useCallback(async (option: ShippingOption) => {
    if (!cart?.cartId) return;
    console.log('[SHIPPING-API] persistShippingMethodToCart: начало', { cartId: cart.cartId, optionId: option.id });
    const shippingMethod = {
      method_id: option.id,
      provider: option.provider,
      option_id: option.id,
      price: option.price,
      costInclTax: option.price,
      metadata: {
        deliveryOptionId: option.id,
        serviceCode: option.serviceCode,
        estimatedDays: option.estimatedDays,
        ...option.metadata
      }
    };
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation UpdateCartShippingMethod($cartId: ID!, $shippingMethod: JSON!) {
            updateCartShippingMethod(cartId: $cartId, shippingMethod: $shippingMethod) {
              cart { cartId }
            }
          }
        `,
        variables: {
          cartId: cart.cartId,
          shippingMethod: JSON.stringify(shippingMethod)
        }
      })
    });
    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0]?.message || 'Failed to update shipping method');
    didPersistRef.current = true;
    console.log('[SHIPPING-API] persistShippingMethodToCart: успех', { cartId: cart.cartId });
  }, [cart?.cartId]);

  /** Только выбор варианта (radiobutton). Синхронизируем с формой и сразу сохраняем метод в корзину, чтобы при «Перейти к оплате» не было гонки. */
  const handleSelectOption = useCallback((option: ShippingOption, providerName: string) => {
    setSelectedOption(option.id);
    setSelectedMethodData({ option, providerName });
    setError(null);
    if (formContext?.updateField) {
      const value = `api_bring_${option.id}`;
      const hasMethodField = formContext.fields?.some((f: { name?: string }) => f.name === 'method');
      if (hasMethodField) {
        formContext.updateField('method', value, ['notEmpty']);
      } else {
        formContext.addField?.('method', value, ['notEmpty']);
      }
    }
    // Сохраняем способ доставки в корзину сразу при выборе, чтобы к моменту «Перейти к оплате» он уже был установлен
    persistShippingMethodToCart(option).catch((err: any) => {
      setError(err.message || 'Не удалось сохранить способ доставки');
      setSelectedOption(null);
      setSelectedMethodData(null);
    });
  }, [formContext, persistShippingMethodToCart]);

  /** Сохраняем выбранный метод Bring в корзину при сабмите формы (переход к оплате). */
  useEffect(() => {
    const form = document.getElementById('checkoutShippingAddressForm');
    if (!form || !cart?.cartId) return;

    const handleSubmit = async (e: Event) => {
      const data = selectedMethodData;
      if (!data) return;

      e.preventDefault();
      e.stopPropagation();
      console.log('[SHIPPING-API] handleSubmit: переход к оплате', { cartId: cart?.cartId, didPersist: didPersistRef.current });
      try {
        // Сохраняем метод в корзину только если ещё не сохранили (напр. при выборе варианта)
        if (!didPersistRef.current) {
          await persistShippingMethodToCart(data.option);
        }

        // Сохраняем адрес и переходим к оплате вручную, чтобы не вызывать native saveMethods()
        // (там selectedMethod.code при выборе Bring даёт undefined и падает с "reading 'code'").
        if (!cart.addAddressApi) throw new Error('addAddressApi not available');
        const fields = formContext?.fields ?? [];
        const get = (n: string) => fields.find((f: { name?: string }) => f.name === n)?.value;
        const address = {
          full_name: get('address[full_name]') ?? '',
          postcode: String(get('address[postcode]') ?? ''),
          telephone: get('address[telephone]') ?? '',
          country: String(get('address[country]') ?? ''),
          province: get('address[province]') ?? null,
          city: String(get('address[city]') ?? ''),
          address_1: String(get('address[address_1]') ?? ''),
          address_2: get('address[address_2]') ?? null
        };
        const addAddressRes = await fetch(cart.addAddressApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
          body: JSON.stringify({ address, type: 'shipping' })
        });
        const addAddressJson = await addAddressRes.json();
        if (addAddressJson.error) throw new Error(addAddressJson.error.message || 'Failed to save address');
        const summary = [address.address_1, address.city, address.country].filter(Boolean).join(', ');
        if (typeof completeStep === 'function') {
          await completeStep('shipment', summary);
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось сохранить способ доставки');
        setSelectedOption(null);
        setSelectedMethodData(null);
      }
    };

    form.addEventListener('submit', handleSubmit, true);
    return () => form.removeEventListener('submit', handleSubmit, true);
  }, [cart?.cartId, cart?.addAddressApi, selectedMethodData, formContext, completeStep, persistShippingMethodToCart]);

  const addressFromCart = cart?.shippingAddress && isAddressComplete(cart.shippingAddress);
  const addressFromForm = !!(formPostcode && formCity && formAddress1 && formCountry);
  const canShowOptions = addressFromCart || addressFromForm;

  if (!cart?.cartId) {
    return null;
  }

  if (!canShowOptions) {
    return (
      <div className="shipping-options-block" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <p style={{ color: '#666' }}>Заполните адрес доставки выше для расчёта вариантов Bring.</p>
      </div>
    );
  }

  if (!loading && providers.length === 0 && !error) {
    return null;
  }

  return (
    <div className="shipping-options-block" style={{ marginTop: '20px', marginBottom: '20px' }}>
      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Загрузка вариантов доставки...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            marginBottom: '15px'
          }}
        >
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {!loading && providers.length > 0 && (
        <div>
          {providers.map((providerResult) => {
            const hasOptions = providerResult.options && providerResult.options.length > 0;

            return (
              <div key={providerResult.provider} className="shipping-methods">
                <h4 className="mt-12 mb-4" style={{ fontSize: '14px' }}>
                  {providerResult.providerName}
                  {providerResult.error && ' (временно недоступен)'}
                </h4>

                <div className="divide-y border rounded border-divider p-4 mb-8">
                  {providerResult.error ? (
                    <div
                      style={{
                        padding: '10px',
                        backgroundColor: '#fee',
                        color: '#c33',
                        borderRadius: '4px'
                      }}
                    >
                      {providerResult.error}
                    </div>
                  ) : !hasOptions ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      Доставка в этот адрес недоступна
                    </p>
                  ) : (
                    <div className="form-field-container">
                      <div className="field-wrapper radio-field">
                        {providerResult.options.map((option) => {
                          const inputId = `method-${providerResult.provider}-${option.id}`;
                          const daysPart = ` (1-4 virkedager)`;
                          const priceText = `${option.price} ${option.currency}`;
                          const labelText = `${option.name}${daysPart} - ${priceText}`;
                          const isSelected = selectedOption === option.id;

                          return (
                            <div key={option.id} style={{ marginBottom: '8px' }}>
                              <label htmlFor={inputId} className="flex" style={{ alignItems: 'center', minHeight: '24px', position: 'relative' }}>
                                <input
                                  type="radio"
                                  name="method"
                                  id={inputId}
                                  value={`api_bring_${option.id}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    handleSelectOption(option, providerResult.providerName)
                                  }
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    minWidth: '20px',
                                    minHeight: '20px',
                                    flexShrink: 0,
                                    margin: 0,
                                    padding: 0,
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    borderRadius: '50%',
                                    border: '2px solid #ccc',
                                    backgroundColor: 'transparent',
                                    position: 'relative',
                                    ...(isSelected
                                      ? {
                                          borderColor: '#007bff',
                                          backgroundColor: '#007bff',
                                          boxShadow: '0 0 0 2px rgba(0, 123, 255, 0.25)'
                                        }
                                      : {})
                                  }}
                                />
                                <span className="pl-4" style={{ flex: 1, lineHeight: '1.5' }}>{labelText}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && providers.length === 0 && !error && (
        <div
          style={{
            padding: '15px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px'
          }}
        >
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
    shippingMethod: PropTypes.string,
    shippingMethodMetadata: PropTypes.string
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

/**
 * GraphQL query для получения данных корзины
 * 
 * EverShop автоматически выполняет этот запрос перед рендерингом компонента
 * Результат передается в props компонента как cart
 */
export const query = `
  query Query($cartId: String) {
    cart(id: $cartId) {
      cartId
      addAddressApi
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
      shippingMethodMetadata
    }
  }
`;

/**
 * Переменные для GraphQL query
 * 
 * getContextValue("cartId") - получает ID корзины из контекста EverShop
 */
export const variables = `{
  cartId: getContextValue("cartId")
}`;
