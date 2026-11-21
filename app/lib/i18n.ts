import english from '@otosanayide/core/locales/en.json';
import type {Locale} from '@otosanayide/core/i18n';

/**
 * Web v2 translation rules (K223). The Turkish UI text is the key; English lives in
 * packages/core/locales/en.json (shared) and app/locales/*.json (this repo, one file per screen group).
 *
 * - Placeholders: the key "{count} işletme" with params {count: 3}.
 * - Plurals: when `params.count` is a number and the English value holds `one|other`, the form is chosen
 *   by count ("{count} business|{count} businesses"). Turkish has no plural form, so the key has no `|`.
 * - A key without English falls back to the Turkish text (tests/i18n-coverage.test.ts reports it).
 *
 * Components use `t` from useLocale(). Library code that builds text takes a `t: Translate` argument
 * and defaults to `turkish`, so plain unit tests keep reading Turkish.
 */
export type TranslateParams = Record<string, string | number>;
export type Translate = (source: string, params?: TranslateParams) => string;

const core = english as Record<string, string>;

function interpolate(text: string, params?: TranslateParams) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(params, key) ? String(params[key]) : match));
}

function pickPlural(text: string, params?: TranslateParams) {
  const count = params?.count;
  if (typeof count !== 'number' || !text.includes('|')) return text;
  const [one, other] = text.split('|');
  return count === 1 ? one! : (other ?? one!);
}

/**
 * Looks a Turkish source text up and fills its placeholders; surrounding whitespace is kept.
 * `params.ctx` picks a meaning when one Turkish word needs different English: the key "Kapalı" with
 * {ctx: 'hours'} reads the dictionary entry "Kapalı@hours" ("Closed") before plain "Kapalı".
 */
export function translateText(locale: Locale, source: string, params?: TranslateParams, own: Record<string, string> = {}): string {
  const key = source.trim();
  if (locale !== 'en' || !key) return interpolate(source, params);
  const ctx = typeof params?.ctx === 'string' ? `${key}@${params.ctx}` : null;
  const found = (ctx ? own[ctx] ?? core[ctx] : undefined) ?? own[key] ?? core[key];
  if (found === undefined) return interpolate(source, params);
  const lead = source.match(/^\s*/)?.[0] ?? '';
  const trail = source.match(/\s*$/)?.[0] ?? '';
  return lead + interpolate(pickPlural(found, params), params) + trail;
}

/**
 * Merges app/locales/*.json in a fixed order, later files winning: the pre-v2 files first, then the
 * Web v2 screen files (v2-*.json, which must not disagree with each other; tests check it), and
 * v2-context.json last, which settles words whose English depends on the screen.
 */
export function mergeLocaleFiles(files: Record<string, Record<string, string>>): Record<string, string> {
  const name = (path: string) => path.split('/').pop() ?? path;
  const rank = (path: string) => (name(path) === 'v2-context.json' ? 2 : name(path).startsWith('v2-') ? 1 : 0);
  const ordered = Object.keys(files).sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b)));
  return Object.assign({}, ...ordered.map((path) => files[path]));
}

/** Turkish passthrough for library defaults and tests: fills placeholders only. */
export const turkish: Translate = (source, params) => translateText('tr', source, params);
