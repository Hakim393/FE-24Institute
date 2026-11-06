/** Counts must never extrapolate statuses from one server page. */
import type { PaginationMeta } from '../types/api';
export function readDashboardPagination<T>(items: readonly T[], pagination?: PaginationMeta): { total: number | null; isComplete: boolean } {
  if (!Array.isArray(items)) return { total: null, isComplete: false };
  if (!pagination) return { total: null, isComplete: false };
  const {totalItems, page, totalPages, hasNextPage} = pagination;
  if (!Number.isSafeInteger(totalItems) || totalItems < items.length || totalItems < 0 ||
      !Number.isSafeInteger(page) || page !== 1 || !Number.isSafeInteger(totalPages) || totalPages < (totalItems === 0 ? 0 : 1) ||
      typeof hasNextPage !== 'boolean') return { total: null, isComplete: false };
  return { total: totalItems, isComplete: !hasNextPage && totalItems === items.length && (totalPages === 1 || (totalItems === 0 && totalPages === 0)) };
}
