import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import english from '../packages/core/locales/en.json';
import {mergeLocaleFiles, translateText, turkish} from '../app/lib/i18n';

// Every literal t('…') in app/ needs English (K223). Keys are the Turkish UI text.
const root = join(import.meta.dirname, '..', 'app');
const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return name === 'locales' ? [] : files(path);
  return /\.(vue|ts)$/.test(name) ? [path] : [];
});
const localeFiles: Record<string, Record<string, string>> = Object.fromEntries(readdirSync(join(root, 'locales')).filter((n) => n.endsWith('.json'))
  .map((n) => [`../locales/${n}`, JSON.parse(readFileSync(join(root, 'locales', n), 'utf8')) as Record<string, string>]));
const own = mergeLocaleFiles(localeFiles);
const dictionary: Record<string, string> = {...(english as Record<string, string>), ...own};
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

/** First string argument of t( … ): quotes, or a backtick literal without ${}. */
function literals(source: string): string[] {
  const out: string[] = [];
  const call = /(?<![\w.$])t\(\s*(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\$])*)`)/g;
  for (const m of source.matchAll(call)) out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n'));
  return out;
}

test('every literal t() text in app/ has an English translation', () => {
  const missing: string[] = [];
  for (const file of files(root)) {
    for (const text of literals(readFileSync(file, 'utf8'))) {
      const key = text.trim();
      if (key && !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(key)) continue;
      if (key && dictionary[key] === undefined) missing.push(`${file.slice(root.length + 1)}: ${key}`);
    }
  }
  assert.deepEqual(missing, [], `${missing.length} text(s) without English`);
});

test('English values keep the placeholders of their Turkish key and use at most one plural bar', () => {
  const bad: string[] = [];
  for (const [key, value] of Object.entries(own)) {
    const forms = value.split('|');
    if (forms.length > 2) bad.push(`${key}: more than one |`);
    for (const form of forms) if (placeholders(form) !== placeholders(key) && !(forms.length === 2 && placeholders(key).includes('count'))) bad.push(`${key}: placeholders differ in "${form}"`);
  }
  assert.deepEqual(bad, []);
});

test('the Web v2 screen dictionaries agree with each other; v2-context.json settles shared words', () => {
  const seen = new Map<string, {file: string; value: string}>();
  const clashes: string[] = [];
  for (const [path, entries] of Object.entries(localeFiles)) {
    const file = path.split('/').pop()!;
    if (!file.startsWith('v2-') || file === 'v2-context.json') continue;
    for (const [key, value] of Object.entries(entries)) {
      const before = seen.get(key);
      if (before && before.value !== value) clashes.push(`${key}: ${before.file} "${before.value}" vs ${file} "${value}"`);
      else seen.set(key, {file, value});
    }
  }
  assert.deepEqual(clashes, []);
  assert.equal(own['Kapalı'], 'Closed', 'v2-context.json wins over core and older files');
  assert.equal(mergeLocaleFiles({'../locales/v2-a.json': {k: 'new'}, '../locales/old.json': {k: 'old'}}).k, 'new');
});

test('translateText fills placeholders, picks the plural form and falls back to Turkish', () => {
  const dict = {'{count} işletme': '{count} business|{count} businesses', 'Kaydet': 'Save'};
  assert.equal(translateText('en', '{count} işletme', {count: 1}, dict), '1 business');
  assert.equal(translateText('en', '{count} işletme', {count: 7}, dict), '7 businesses');
  assert.equal(translateText('tr', '{count} işletme', {count: 7}, dict), '7 işletme');
  assert.equal(translateText('en', ' Kaydet ', undefined, dict), ' Save ');
  assert.equal(translateText('en', 'Çevirisi olmayan', undefined, dict), 'Çevirisi olmayan');
  assert.equal(turkish('{n} gün', {n: 3}), '3 gün');
  const ctx = {'Kapalı': 'Disabled', 'Kapalı@hours': 'Closed'};
  assert.equal(translateText('en', 'Kapalı', {ctx: 'hours'}, ctx), 'Closed');
  assert.equal(translateText('en', 'Kapalı', {ctx: 'other'}, ctx), 'Disabled', 'an unknown context falls back to the plain key');
  assert.equal(translateText('tr', 'Kapalı', {ctx: 'hours'}, ctx), 'Kapalı');
});
