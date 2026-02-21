import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useClient } from 'urql';
// @ts-ignore - резолвится из ядра при сборке
import { Field } from '@components/common/form/Field';
// @ts-ignore - резолвится из ядра при сборке
import { useFormContext } from '@components/common/form/Form';
// @ts-ignore - резолвится из ядра при сборке
import { useCheckout } from '@components/common/context/checkout';
// @ts-ignore - резолвится из ядра при сборке
import { useCheckoutStepsDispatch } from '@components/common/context/checkoutSteps';
import { toast } from 'react-toastify';

const QUERY = `
  query Query($cartId: String) {
    cart(id: $cartId) {
      shippingAddress {
        id: cartAddressId
        fullName
        postcode
        telephone
        country {
          code
          name
        }
        province {
          code
          name
        }
        city
        address1
        address2
      }
    }
  }
`;

interface ShippingMethodsProps {
  getMethodsAPI: string;
  cart: {
    addShippingMethodApi: string;
  };
  allowedCountries: {
    code: string;
    name: string;
    provinces?: { code: string; name: string }[];
  }[];
}

export default function ShippingMethods({ getMethodsAPI, cart: { addShippingMethodApi }, allowedCountries }: ShippingMethodsProps) {
  const formContext = useFormContext();
  const { completeStep } = useCheckoutStepsDispatch();
  const [loading, setLoading] = React.useState(false);
  const [addressProvided, setAddressProvided] = React.useState(false);
  const [methods, setMethods] = React.useState<any[]>([]);
  const { cartId } = useCheckout();
  const client = useClient();

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const { fields } = formContext;
      let check = !!fields.length;
      const country = fields.find((f: any) => f.name === 'address[country]');
      const province = fields.find((f: any) => f.name === 'address[province]');
      if (country && !country.value) {
        check = false;
      }
      const selectedCountry = allowedCountries.find((c) => c.code === country?.value);
      if (selectedCountry && selectedCountry.provinces) {
        if (province && !province.value) {
          check = false;
          setAddressProvided(false);
          setMethods([]);
        }
      } else {
        check = true;
      }
      if (check === true) {
        setAddressProvided(true);
        axios
          .get(`${getMethodsAPI}?country=${country.value}&province=${province?.value || ''}`)
          .then((response) => {
            setMethods((previous) => {
              const { methods: shippingMethods } = response.data.data;
              // Фильтруем технический метод Bring по name/code перед рендерингом
              const filtered = (shippingMethods || []).filter(
                (m: any) => m.name !== 'Bring' && m.code !== 'bring'
              );
              return filtered.map((m: any) => {
                const find = previous.find((p: any) => p.code === m.code);
                if (find) {
                  return { ...find, ...m };
                }
                return { ...m, selected: false };
              });
            });
            setLoading(false);
          });
      } else {
        setAddressProvided(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [formContext, allowedCountries, getMethodsAPI]);

  React.useEffect(() => {
    async function saveMethods() {
      const selectedMethod = methods.find((m) => m.selected === true);
      try {
        const response = await axios.post(
          addShippingMethodApi,
          {
            method_code: selectedMethod.code,
            method_name: selectedMethod.name
          },
          {
            validateStatus: () => true
          }
        );
        if (!response.data.error) {
          const result = await client
            .query(QUERY, { cartId }, { requestPolicy: 'network-only' })
            .toPromise();
          const address = result.data.cart.shippingAddress;
          await completeStep('shipment', `${address.address1}, ${address.city}, ${address.country.name}`);
        } else {
          toast.error(response.data.error.message);
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    }
    if (formContext.state === 'submitSuccess') {
      saveMethods();
    }
  }, [formContext.state, methods, addShippingMethodApi, client, cartId, completeStep]);

  return (
    <div className="shipping-methods">
      {loading === true && (
        <div className="loading">
          <svg
            style={{
              background: 'rgb(255, 255, 255, 0)',
              display: 'block',
              shapeRendering: 'auto'
            }}
            width="2rem"
            height="2rem"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid"
          >
            <circle
              cx="50"
              cy="50"
              fill="none"
              stroke="#f6f6f6"
              strokeWidth="10"
              r="43"
              strokeDasharray="202.63272615654165 69.54424205218055"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                repeatCount="indefinite"
                dur="1s"
                values="0 50 50;360 50 50"
                keyTimes="0;1"
              />
            </circle>
          </svg>
        </div>
      )}
      <h4 className="mt-12 mb-4">Shipping Method</h4>
      {addressProvided === true && methods.length === 0 && (
        <div className="text-center p-3 border border-divider rounded text-textSubdued">
          Sorry, there is no available method for your address
        </div>
      )}
      {addressProvided === false && (
        <div className="text-center p-3 border border-divider rounded text-textSubdued">
          Please enter a shipping address in order to see shipping quotes
        </div>
      )}
      {methods.length > 0 && (
        <div className="divide-y border rounded border-divider p-4 mb-8">
          <Field
            type="radio"
            name="method"
            validationRules={['notEmpty']}
            options={methods.map((m) => ({
              value: m.code,
              text: `${m.name} - ${m.cost}`
            }))}
            onChange={(value: string) => {
              const newMethods = methods.map((m) => {
                if (m.code === value) {
                  return { ...m, selected: true };
                }
                return { ...m, selected: false };
              });
              setMethods(newMethods);
            }}
          />
        </div>
      )}
    </div>
  );
}

ShippingMethods.propTypes = {
  getMethodsAPI: PropTypes.string.isRequired,
  cart: PropTypes.shape({
    addShippingMethodApi: PropTypes.string.isRequired
  }).isRequired,
  allowedCountries: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string,
      name: PropTypes.string,
      provinces: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          name: PropTypes.string
        })
      )
    })
  ).isRequired
};

export const layout = {
  areaId: 'checkoutShippingAddressForm',
  sortOrder: 60
};

export const query = `
  query Query {
    getMethodsAPI: url(routeId: "getShippingMethods", params: [{ key: "cart_id", value: getContextValue('cart_id') }])
    cart {
      addShippingMethodApi
    }
    allowedCountries  {
      code
      name
      provinces {
        name
        code
      }
    }
  }
`;

