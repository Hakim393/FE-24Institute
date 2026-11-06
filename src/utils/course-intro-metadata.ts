/** Convert a one-item-per-line editor to backend metadata arrays. Never silently truncate. */
export function textToListItems(input: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) continue;
    if (value.length > 300) throw new Error('Satu poin pengenalan maksimal 300 karakter.');
    if (!seen.has(value)) { seen.add(value); items.push(value); }
  }
  if (items.length > 30) throw new Error('Maksimal 30 poin untuk setiap bagian pengenalan.');
  return items;
}
export function listItemsToText(items?: string[] | null): string {
  return Array.isArray(items) ? items.join('\n') : '';
}
type IntroInput = { subtitle: string; learningObjectives: string[]; requirements: string[]; targetAudience: string[] };
export function buildIntroMetadataPatch(next: IntroInput, previous: IntroInput): {
  shortDescription?: string; learningObjectives?: string[]; requirements?: string[]; targetAudience?: string[];
} {
  const patch: { shortDescription?: string; learningObjectives?: string[]; requirements?: string[]; targetAudience?: string[] } = {};
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
  if (normalize(next.subtitle).length > 500) throw new Error('Ringkasan promosi maksimal 500 karakter.');
  if (!normalize(next.subtitle)) throw new Error('Ringkasan promosi tidak boleh kosong.');
  if (normalize(next.subtitle) !== normalize(previous.subtitle)) patch.shortDescription = normalize(next.subtitle);
  for (const key of ['learningObjectives', 'requirements', 'targetAudience'] as const) {
    if (JSON.stringify(next[key]) !== JSON.stringify(previous[key])) patch[key] = next[key];
  }
  return patch;
}
