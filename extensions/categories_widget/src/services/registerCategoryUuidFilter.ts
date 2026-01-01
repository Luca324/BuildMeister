// @ts-ignore - EverShop resolves these modules at runtime
import { OPERATION_MAP } from '@evershop/evershop/lib/util/filterOperationMap'
// @ts-ignore - EverShop resolves these modules at runtime
import { addProcessor } from '@evershop/evershop/lib/util/registry'
// @ts-ignore - types resolved at runtime
import { value } from '@evershop/postgres-query-builder'

export default () => {
	addProcessor('categoryCollectionFilters', (filters: any[]) => {
		filters.push({
			key: 'uuid',
			operation: ['in', 'eq'],
			callback: (query: any, operation: string, val: string | string[], currentFilters: any[]) => {
				if (operation === 'in') {
					// Если val это массив, используем его напрямую, иначе разбиваем строку
					const uuids = Array.isArray(val)
						? val.filter((v) => v && v.length > 0)
						: val
							.split(',')
							.map((v) => v.trim())
							.filter((v) => v.length > 0)

					if (uuids.length > 0) {
						query.andWhere('category.uuid', 'IN', value(uuids))
						currentFilters.push({
							key: 'uuid',
							operation,
							value: val,
						})
					}
				} else if (operation === 'eq') {
					query.andWhere('category.uuid', OPERATION_MAP[operation], val)
					currentFilters.push({
						key: 'uuid',
						operation,
						value: val,
					})
				}
			},
		})
		return filters
	}, 10)
}

