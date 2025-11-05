// @ts-ignore - EverShop resolves these modules at runtime
import { OPERATION_MAP } from '@evershop/evershop/lib/util/filterOperationMap'
// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry'
// @ts-ignore - types resolved at runtime
import { value } from '@evershop/postgres-query-builder'

export default () => {
	console.log('Registering category_id filter*')

	addProcessor('categoryCollectionFilters', (filters: any[]) => {
		filters.push({
			key: 'category_id',
			operation: ['in', 'eq'],
			callback: (query: any, operation: string, val: string | string[] | number | number[], currentFilters: any[]) => {
				if (operation === 'in') {
					// Преобразуем все значения в числа
					const ids = Array.isArray(val)
						? val.map((v) => {
							const num = typeof v === 'string' ? parseInt(v, 10) : v;
							return isNaN(num) ? null : num;
						}).filter((v) => v !== null)
						: [typeof val === 'string' ? parseInt(val, 10) : val].filter((v) => !isNaN(v));

					if (ids.length > 0) {
						query.andWhere('category.category_id', 'IN', value(ids))
						currentFilters.push({
							key: 'category_id',
							operation,
							value: val,
						})
					}
				} else if (operation === 'eq') {
					const num = typeof val === 'string' ? parseInt(val, 10) : (typeof val === 'number' ? val : null);
					if (num !== null && !isNaN(num)) {
						query.andWhere('category.category_id', OPERATION_MAP[operation], num)
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
	}, 10)
}

