/** A failed mutation must not close a modal or show a success toast. */
export function requireMutationSuccess(response: { success: boolean; message?: string } | null | undefined): void {
  if (!response?.success) throw new Error(response?.message || 'Operasi tidak berhasil disimpan di server.');
}

/** Creating a course must return a real ID before opening its builder. */
export function requireCreatedId(response: { success: boolean; message?: string; data?: { id?: unknown } | null } | null | undefined): string {
  requireMutationSuccess(response);
  const id = response?.data?.id;
  if (typeof id !== 'string' || !id.trim()) throw new Error('Backend tidak mengembalikan ID kursus yang valid.');
  return id;
}
