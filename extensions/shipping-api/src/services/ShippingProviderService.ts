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
   */
  async calculateAll(request: ShippingCalculationRequest): Promise<ProviderResult[]> {
    const activeAdapters = await this.getActiveProviders();

    if (activeAdapters.length === 0) {
      return [];
    }

    // Используем Promise.allSettled для параллельного выполнения всех запросов
    // Это гарантирует, что ошибка одного провайдера не блокирует остальные
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
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
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

