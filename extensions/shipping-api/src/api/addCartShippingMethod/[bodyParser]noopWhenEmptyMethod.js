/**
 * Middleware для маршрута addCartShippingMethod.
 * Когда выбран способ доставки от API (Bring), при «Перейти к оплате» метод уже
 * сохранён через updateCartShippingMethod; native saveMethods() шлёт method_code: undefined.
 * Чтобы не затирать сохранённый метод, при пустом method_code отвечаем 200 и не вызываем next().
 */
export default (request, response, next) => {
  const methodCode = request.body?.method_code;
  if (methodCode === undefined || methodCode === null || methodCode === '') {
    console.log('[SHIPPING-API] addCartShippingMethod: пропуск сохранения метода, метод уже установлен (Bring)');
    response.status(200);
    response.json({
      data: {
        method: { code: null }
      }
    });
    return;
  }
  next();
};
