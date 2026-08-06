export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const MAX_PAGE_SIZE = 100;

/** Parse and clamp page/pageSize query params. */
export function getPagination(pageValue?: unknown, pageSizeValue?: unknown): Pagination {
  const rawPage = Number(pageValue ?? 1);
  const rawSize = Number(pageSizeValue ?? 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
      : 10;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function buildPageMeta(total: number, pagination: Pagination): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages,
  };
}
