export type Contract = {
  start: string; end: string; maxItems: number; requiredSources: string[];
};
export type Brief = {
  delivery: 'review-only';
  coverage: { source: string; state: 'checked' | 'unavailable'; checkedAt?: string }[];
  items: { id: string; kind: 'shipped' | 'blocked' | 'decision'; title: string;
    source: string; occurredAt: string }[];
};
export type Result = { status: 'ready' | 'partial' | 'invalid'; errors: string[] };
const timestamp = (s: unknown): number =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s)
    ? Date.parse(s) : NaN;
const web = (s: unknown): boolean => {
  try { if (typeof s !== 'string') return false;
    const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password;
  } catch { return false; }
};
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

// Local output validation only. No fetching, permission enforcement, or Grok Bot API.
// `ready` means this contract passed, never that linked claims are true.
export function validateBrief(input: unknown, c: Contract): Result {
  const errors: string[] = [];
  const start = timestamp(c.start), end = timestamp(c.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end ||
      !Number.isInteger(c.maxItems) || c.maxItems < 1 ||
      !Array.isArray(c.requiredSources) || c.requiredSources.length === 0 ||
      !c.requiredSources.every(web) || new Set(c.requiredSources).size !== c.requiredSources.length)
    return { status: 'invalid', errors: ['Invalid contract'] };
  if (!object(input) || !Array.isArray(input.coverage) || !Array.isArray(input.items))
    return { status: 'invalid', errors: ['Expected coverage and items arrays'] };
  if (input.delivery !== 'review-only') errors.push('Delivery must be review-only');
  if (input.items.length > c.maxItems) errors.push('Item cap exceeded; split the batch and disclose overflow');
  const coverage = new Map<string, Record<string, unknown>>();
  let partial = false;
  for (const entry of input.coverage) {
    if (!object(entry) || typeof entry.source !== 'string' || !c.requiredSources.includes(entry.source)) {
      errors.push('Unknown coverage source'); continue;
    }
    if (coverage.has(entry.source)) errors.push('Duplicate coverage source');
    coverage.set(entry.source, entry);
    if (entry.state === 'unavailable') partial = true;
    else if (entry.state !== 'checked') errors.push('Invalid coverage state');
    else if (!Number.isFinite(timestamp(entry.checkedAt)) || timestamp(entry.checkedAt) < end)
      errors.push('Checked source needs a timestamp at or after the release window end');
  }
  for (const source of c.requiredSources) if (!coverage.has(source)) {
    errors.push('Required source omitted: ' + source);
  }
  const ids = new Set<string>();
  for (const item of input.items) {
    if (!object(item)) { errors.push('Invalid item'); continue; }
    if (typeof item.id !== 'string' || !item.id.trim()) errors.push('Item needs an id');
    else { if (ids.has(item.id)) errors.push('Duplicate item id'); ids.add(item.id); }
    if (typeof item.title !== 'string' || !item.title.trim()) errors.push('Item needs a title');
    if (!['shipped', 'blocked', 'decision'].includes(String(item.kind))) errors.push('Invalid item kind');
    const at = timestamp(item.occurredAt);
    if (!Number.isFinite(at) || at < start || at > end) errors.push('Item is outside the release window');
    if (!web(item.source)) errors.push('Item needs a web source');
    // Evidence URLs can be deep links, but must come from a declared, checked source origin.
    const checked = [...coverage.values()].some(e => e.state === 'checked' && web(item.source) &&
      new URL(String(e.source)).origin === new URL(String(item.source)).origin);
    if (!checked) errors.push('Item has no checked source origin');
  }
  return { status: errors.length ? 'invalid' : partial ? 'partial' : 'ready', errors };
}
