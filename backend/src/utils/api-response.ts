/** Standard success envelope used by every controller. */
export function ok<T>(data: T, message?: string) {
  return { success: true, message, data };
}

export function created<T>(data: T, message?: string) {
  return { success: true, message, data };
}
