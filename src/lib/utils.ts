export function safeStringify(obj: any, space?: number | string): string {
  const cache = new WeakSet();
  try {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return undefined;
          }
          cache.add(value);
        }
        if (typeof value === 'function' || (typeof window !== 'undefined' && (value instanceof HTMLElement || value instanceof Event))) {
          return undefined;
        }
        return value;
      },
      space
    );
  } catch (err) {
    console.error('safeStringify error:', err);
    return '{}';
  }
}

export function sanitizeForFirestore(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (seen.has(obj)) return null;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item, seen));
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (
      val !== undefined &&
      typeof val !== 'function' &&
      !(typeof window !== 'undefined' && (val instanceof Event || val instanceof HTMLElement))
    ) {
      clean[key] = sanitizeForFirestore(val, seen);
    }
  }
  return clean;
}
