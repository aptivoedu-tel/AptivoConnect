
import crypto from 'crypto';

/**
 * Normalizes text for consistent hashing
 * Lowercase, removes punctuation, removes extra whitespace
 */
export const normalizeText = (text: string): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]|_/g, "")
        .replace(/\s+/g, " ");
};

/**
 * Computes a robust hash for an MCQ to identify duplicates.
 * Includes Question, Options, and Correct Option.
 * Ignoring university for global duplicate checking.
 */
export const computeMCQHash = (mcq: {
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
}): string => {
    const q = normalizeText(mcq.question);
    const a = normalizeText(mcq.option_a);
    const b = normalizeText(mcq.option_b);
    const c = normalizeText(mcq.option_c);
    const d = normalizeText(mcq.option_d);
    const ans = (mcq.correct_option || '').toString().trim().toUpperCase();

    // We join with a pipe to avoid collisions between fields
    const combined = `${q}|${a}|${b}|${c}|${d}|${ans}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
};
