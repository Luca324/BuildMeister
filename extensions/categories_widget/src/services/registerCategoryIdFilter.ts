// @ts-ignore - EverShop resolves these modules at runtime
import { OPERATION_MAP } from '@evershop/evershop/lib/util/filterOperationMap'
// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry'
// @ts-ignore - types resolved at runtime
import { value } from '@evershop/postgres-query-builder'

/**
 * Регистрация процессора (фильтра) для категорий
 * 
 * Процессор - это механизм Evershop для расширения функциональности системы.
 * Процессоры позволяют добавлять новые фильтры для коллекций (товаров, категорий и т.д.)
 * 
 * Зачем нужен этот процессор?
 * - Виджет использует фильтр по category_id в GraphQL запросе:
 *   categories(filters: [{key: "category_id", operation: in, value: [1, 2, 3]}])
 * - Evershop не знает, как обработать фильтр category_id по умолчанию. Процессор добавляет поддержку этого фильтра
 * 
 * Как это работает:
 * 1. Виджет делает GraphQL запрос с фильтром category_id
 * 2. Evershop вызывает все процессоры для 'categoryCollectionFilters'
 * 3. Наш процессор добавляет SQL условие: WHERE category.category_id IN (1, 2, 3)
 * 4. Запрос выполняется с фильтром
 * 
 * Когда НЕ нужен процессор?
 * - Если виджет использует только стандартные фильтры Evershop
 * - Если виджет не использует фильтрацию в GraphQL запросах
 * 
 * См. также: src/components/widgets/CategoriesWidget.tsx - использование фильтра
 */
export default () => {
	/**
	 * Регистрация процессора для фильтров коллекции категорий
	 * 
	 * 'categoryCollectionFilters' - имя точки расширения (hook point)
	 * (filters: any[]) => {...} - функция-обработчик
	 * 10 - приоритет выполнения (меньше = выполняется раньше)
	 */
	addProcessor('categoryCollectionFilters', (filters: any[]) => {
		/**
		 * Добавляем новый фильтр в список доступных фильтров
		 */
		filters.push({
			key: 'category_id',           // Имя фильтра (используется в GraphQL)
			operation: ['in', 'eq'],      // Поддерживаемые операции: IN (массив) и = (равно)
			/**
			 * Callback функция вызывается при использовании фильтра
			 * 
			 * @param query - объект SQL запроса (для добавления условий WHERE)
			 * @param operation - операция фильтра ('in' или 'eq')
			 * @param val - значение фильтра (может быть массивом или одним значением)
			 * @param currentFilters - массив текущих фильтров (для отображения в UI)
			 */
			callback: (query: any, operation: string, val: string | string[] | number | number[], currentFilters: any[]) => {
				if (operation === 'in') {
					// Операция IN - фильтр по нескольким значениям
					// Преобразуем все значения в числа
					const ids = Array.isArray(val)
						? val.map((v) => {
							const num = typeof v === 'string' ? parseInt(v, 10) : v;
							return isNaN(num) ? null : num;
						}).filter((v) => v !== null)
						: [typeof val === 'string' ? parseInt(val, 10) : val].filter((v) => !isNaN(v));

					if (ids.length > 0) {
						// Добавляем SQL условие: WHERE category.category_id IN (1, 2, 3)
						query.andWhere('category.category_id', 'IN', value(ids))
						// Сохраняем фильтр для отображения в UI
						currentFilters.push({
							key: 'category_id',
							operation,
							value: val,
						})
					}
				} else if (operation === 'eq') {
					// Операция = (равно) - фильтр по одному значению
					const num = typeof val === 'string' ? parseInt(val, 10) : (typeof val === 'number' ? val : null);
					if (num !== null && !isNaN(num)) {
						// Добавляем SQL условие: WHERE category.category_id = 1
						query.andWhere('category.category_id', OPERATION_MAP[operation], num)
						// Сохраняем фильтр для отображения в UI
						currentFilters.push({
							key: 'category_id',
							operation,
							value: val,
						})
					}
				}
			},
		})
		return filters
	}, 10) // Приоритет: 10 (можно изменить для контроля порядка выполнения)
}

