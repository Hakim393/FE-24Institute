/** Exact response shape checks grounded in the development OpenAPI snapshot. */
export function requireNotificationRead(result: unknown, id: string): void {
  const r = result as any;
  if (r?.success !== true || r?.data?.id !== id || r?.data?.isRead !== true || typeof r?.data?.changed !== 'boolean') {
    throw new Error('Server tidak mengonfirmasi notifikasi yang ditandai dibaca. Muat ulang sebelum mencoba lagi.');
  }
}
export function requireNotificationsReadAll(result: unknown): number {
  const r = result as any;
  const count = r?.data?.markedRead;
  if (r?.success !== true || !Number.isSafeInteger(count) || count < 0) {
    throw new Error('Server tidak mengonfirmasi pembaruan semua notifikasi.');
  }
  return count;
}
export function requireCertificateTransition(result: unknown, id: string, status: 'ELIGIBLE' | 'REJECTED' | 'ISSUED' | 'REVOKED'): void {
  const r = result as any;
  if (r?.success !== true || r?.data?.id !== id || r?.data?.status !== status) {
    throw new Error('Status sertifikat belum dikonfirmasi server. Periksa ulang sebelum mengirim ulang aksi.');
  }
}
export function requireCertificateRequest(result: unknown): { id: string; status: string; existing: boolean; issued: boolean } {
  const r = result as any;
  const d = r?.data;
  if (r?.success !== true || !d || typeof d.id !== 'string' || d.id.length === 0 ||
      !['PROCESSING','ELIGIBLE','ISSUED','REJECTED'].includes(d.status) ||
      d.issuerName !== '24Institute' || typeof d.existing !== 'boolean' || typeof d.issued !== 'boolean') {
    throw new Error('Status pengajuan sertifikat belum dikonfirmasi server. Periksa daftar sebelum mencoba lagi.');
  }
  return d;
}
export function normalizeMediaUpload(result: unknown): { mediaId: string; url: string } {
  const r = result as any;
  const id = r?.data?.media?.id;
  const url = r?.data?.media?.secureUrl;
  if (r?.success !== true || typeof id !== 'string' || id.length < 1 ||
      typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error('Respons upload media tidak sesuai kontrak server. Jangan gunakan URL yang belum terverifikasi.');
  }
  return { mediaId: id, url };
}
export function requirePdfBlob(value: unknown): asserts value is Blob {
  if (!(value instanceof Blob) || value.size === 0 || !/^application\/pdf(?:;|$)/i.test(value.type)) {
    throw new Error('Berkas sertifikat yang diterima bukan PDF yang valid menurut metadata respons.');
  }
}
