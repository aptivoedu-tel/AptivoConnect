import { createHash } from 'crypto';

/** Stable negative IDs use the existing unique ID index, without a data migration. */
export function answerId(kind: string, session: string | number, question: number) {
  return -parseInt(createHash('sha256').update(`${kind}:${session}:${question}`).digest('hex').slice(0, 13), 16);
}

export function answersMatch(actual: unknown, expected: unknown, type: string) {
  if (type === 'multiple' || type === 'mcq_multiple') {
    const normalize = (value: unknown) => (Array.isArray(value) ? value : String(value).split(',')).map(String).sort().join('\u0000');
    return normalize(actual) === normalize(expected);
  }
  return String(actual) === String(expected);
}

export function nonnegativeSeconds(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}
