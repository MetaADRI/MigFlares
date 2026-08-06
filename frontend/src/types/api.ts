/** Generic API contract types. */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  [key: string]: unknown;
}
