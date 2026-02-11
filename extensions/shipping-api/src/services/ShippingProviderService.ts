/**
 * Сервис для управления всеми провайдерами доставки
 * Регистрирует адаптеры, выполняет параллельные запросы, обрабатывает ошибки
 */

import { BaseShippingAdapter } from '../adapters/BaseShippingAdapter.js';
import {
  ShippingOption,
  ShippingCalculationRequest,
  ShippingBookingRequest,
  ShippingBookingResult
} from '../adapters/types.js';

export interface ProviderResult {
  provider: string;
  providerName: string;
  options: ShippingOption[];
  error?: string;
}

export class ShippingProviderService {
  private adapters: Map<string, BaseShippingAdapter> = new Map();
  private static instance: ShippingProviderService | null = null;

  /**
   * Singleton для глобального доступа к сервису
   */
  static getInstance(): ShippingProviderService {
    if (!ShippingProviderService.instance) {
      ShippingProviderService.instance = new ShippingProviderService();
    }
    return ShippingProviderService.instance;
  }

  /**
   * Регистрация адаптера провайдера
   */
  registerAdapter(adapter: BaseShippingAdapter): void {
    const code = adapter.getProviderCode();
    this.adapters.set(code, adapter);
  }

  /**
   * Получение адаптера по коду провайдера
   */
  getAdapter(providerCode: string): BaseShippingAdapter | undefined {
    return this.adapters.get(providerCode);
  }

  /**
   * Получение названия провайдера по коду
   */
  getProviderName(providerCode: string): string {
    const adapter = this.getAdapter(providerCode);
    return adapter ? adapter.getProviderName() : providerCode;
  }

  /**
   * Получение списка активных провайдеров из конфигурации
   */
  private async getActiveProviders(): Promise<BaseShippingAdapter[]> {
    // @ts-ignore - EverShop resolves these modules at runtime
    const { select } = await import('@evershop/postgres-query-builder');
    // @ts-ignore
    // @ts-ignore - EverShop resolves these modules at runtime
    const { pool, getConnection } = await import('@evershop/evershop/lib/postgres');
    // getConnection() returns PoolClient, pool is Pool - both work with load/execute
    const connection: any = pool || await getConnection();

    const setting = await select()
      .from('setting')
      .where('name', '=', 'shipping_api')
              .load(connection);

    if (!setting) {
      return [];
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

    const providers = configData?.providers || {};
    const activeAdapters: BaseShippingAdapter[] = [];

    for (const [code, config] of Object.entries(providers)) {
      const providerConfig = config as any;
      if (providerConfig.enabled && this.adapters.has(code)) {
        activeAdapters.push(this.adapters.get(code)!);
      }
    }

    return activeAdapters;
  }

  /**
   * Параллельный расчет стоимости доставки от всех активных провайдеров
   * 
   * АРХИТЕКТУРА:
   * - Запросы к разным провайдерам выполняются параллельно для скорости
   * - Используется Promise.allSettled вместо Promise.all для устойчивости к ошибкам
   * - Если один провайдер недоступен, остальные продолжают работать
   * 
   * ПРОЦЕСС:
   * 1. Получаем список активных провайдеров из конфигурации
   * 2. Для каждого провайдера вызываем calculateShipping() параллельно
   * 3. Обрабатываем результаты: успешные и ошибки
   * 4. Возвращаем массив результатов с вариантами доставки или ошибками
   * 
   * ОБРАБОТКА ОШИБОК:
   * - Ошибки одного провайдера не блокируют остальные
   * - Ошибки возвращаются в поле error для отображения пользователю
   * - Пользователь видит, какие провайдеры доступны, а какие нет
   * 
   * ПРОИЗВОДИТЕЛЬНОСТЬ:
   * - Все запросы выполняются одновременно (не последовательно)
   * - Время выполнения = время самого медленного запроса, а не сумма всех запросов
   * - Если 3 провайдера по 2 секунды каждый, общее время = ~2 секунды, а не 6
   */
  async calculateAll(request: ShippingCalculationRequest): Promise<ProviderResult[]> {
    const activeAdapters = await this.getActiveProviders();

    if (activeAdapters.length === 0) {
      return [];
    }

    /**
     * Promise.allSettled vs Promise.all:
     * - Promise.all: останавливается при первой ошибке, остальные запросы отменяются
     * - Promise.allSettled: ждет завершения всех запросов, даже если некоторые упали
     * 
     * Мы используем Promise.allSettled, чтобы:
     * - Получить результаты от всех провайдеров, даже если один недоступен
     * - Показать пользователю все доступные варианты доставки
     * - Не блокировать интерфейс из-за одного недоступного провайдера
     */
    const results = await Promise.allSettled(
      activeAdapters.map(async (adapter) => {
        try {
          const options = await adapter.calculateShipping(request);
          return {
            provider: adapter.getProviderCode(),
            providerName: adapter.getProviderName(),
            options,
            error: undefined
          };
        } catch (error: any) {
          // Ошибка конкретного провайдера не должна блокировать остальные
          // Возвращаем результат с ошибкой для отображения пользователю
          return {
            provider: adapter.getProviderCode(),
            providerName: adapter.getProviderName(),
            options: [],
            error: error.message || 'Unknown error'
          };
        }
      })
    );

    // Преобразуем результаты Promise.allSettled в массив ProviderResult
    // Promise.allSettled возвращает массив { status: 'fulfilled'|'rejected', value|reason }
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        // Запрос успешно выполнен
        return result.value;
      } else {
        // Запрос упал с ошибкой (не должно происходить, т.к. мы ловим ошибки в try-catch)
        // Но на всякий случай обрабатываем этот случай
        const adapter = activeAdapters[index];
        return {
          provider: adapter.getProviderCode(),
          providerName: adapter.getProviderName(),
          options: [],
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  /**
   * Создание отправления в указанном провайдере
   */
  async createShipment(
    providerCode: string,
    request: ShippingBookingRequest
  ): Promise<ShippingBookingResult> {
    const adapter = this.getAdapter(providerCode);

    if (!adapter) {
      throw new Error(`Provider ${providerCode} not found or not registered`);
    }

    return await adapter.createBooking(request);
  }
}

