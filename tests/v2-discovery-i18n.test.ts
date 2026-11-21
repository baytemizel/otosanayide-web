import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import type {Business} from '@otosanayide/core';
import {searchBusinesses} from '../app/data/mock/search';
import {formatKm, formatRating} from '../app/data/mock/businesses';
import {translateText, type Translate} from '../app/lib/i18n';
import {hoursState, localiseCard, toCardBusiness} from '../app/lib/v2/business-card';
import {compareFromLive, comparisonName} from '../app/lib/v2/compare';
import {dayRangeLabel, monthLabel, ownReviewMeta, profileSeo, scoreChip} from '../app/lib/v2/profile';
import {openLabel, resultCount} from '../app/lib/v2/search';
import {listNameError} from '../app/lib/v2/saved';

// English output of the search / profile / compare / saved helpers (K223); Turkish stays covered by the other tests.
const root = join(import.meta.dirname, '..', 'app', 'locales');
const own: Record<string, string> = Object.assign({}, ...readdirSync(root).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(join(root, n), 'utf8'))));
const en: Translate = (source, params) => translateText('en', source, params, own);
const tr: Translate = (source, params) => translateText('tr', source, params, own);

const business = (extra: Partial<Business> = {}): Business => ({
  id: 'a', name: 'Örnek A', city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sokak No 1', categories: ['body'],
  services: ['Kaporta'], brands: ['BMW'], coordinateStatus: 'unverified', ownership: 'unclaimed', features: {quotes: false, appointments: false},
  ownerReady: false, published: true, ...extra,
});
const hours = {timezone: 'Europe/Istanbul' as const, week: [{day: 3, intervals: [{open: '09:00', close: '18:00'}]}]};
const wednesday = new Date('2026-11-18T10:00:00+03:00');
const early = new Date('2026-11-18T07:00:00+03:00');

test('hours text: Turkish dative suffix, English plain clock', () => {
  assert.equal(hoursState(hours, wednesday).text, 'Açık · 18.00’e kadar');
  assert.equal(hoursState(hours, wednesday, tr, 'tr-TR').text, 'Açık · 18.00’e kadar');
  assert.equal(hoursState(hours, wednesday, en, 'en-GB').text, 'Open · until 18:00');
  assert.equal(hoursState(hours, early, en, 'en-GB').text, 'Closed · opens at 09:00');
  assert.equal(hoursState(undefined, early, en, 'en-GB').text, 'No hours information');
});

test('cards are localised for display only; Turkish output is unchanged', () => {
  const live = toCardBusiness(business(), {openingHours: hours}, wednesday);
  assert.deepEqual(localiseCard(live, tr, 'tr-TR', wednesday), live);
  const english = localiseCard(live, en, 'en-GB', wednesday);
  assert.equal(english.category, 'Bodywork & Paint');
  assert.equal(english.hoursText, 'Open · until 18:00');
  assert.deepEqual(english.tags, ['Kaporta'], 'API services are not translated');
  const demo = searchBusinesses[0]!;
  assert.deepEqual(localiseCard(demo, tr), demo);
  assert.equal(localiseCard(demo, en, 'en-GB').category, 'Paintless dent repair');
  assert.equal(localiseCard(demo, en, 'en-GB').hoursText, 'Open · until 19:00');
  assert.deepEqual(openLabel({...live, open: true}, en), {open: true, text: 'Open'});
});

test('counts, numbers and names in English', () => {
  assert.equal(resultCount({value: 1, exact: true}, 0, en), '1 business');
  assert.equal(resultCount({value: 480, exact: false}, 0, en), 'at least 480 businesses');
  assert.equal(formatKm(1.2), '1,2 km');
  assert.equal(formatKm(1.2, 'en-GB'), '1.2 km');
  assert.equal(formatRating(4.5, 'en-GB'), '4.5');
  assert.equal(comparisonName([{name: 'Örnek A'}, {name: 'Örnek B'}], en), 'Comparison: A · B');
  assert.equal(listNameError('x'.repeat(61), 60, en), 'The list name can be at most 60 characters.');
  assert.equal(compareFromLive(business(), {openingHours: hours}, null, wednesday, en, 'en-GB').hours.text, 'Open · until 18:00');
});

test('profile dates, day ranges, chips and SEO text in English', () => {
  assert.equal(monthLabel('2026-10'), 'Ekim 2026');
  assert.equal(monthLabel('2026-10', 'en-GB'), 'October 2026');
  assert.equal(dayRangeLabel([3, 4, 5], 'en-GB'), 'Wednesday – Friday');
  assert.equal(dayRangeLabel([0], 'en-GB'), 'Sunday');
  assert.equal(scoreChip('quality', 5, en), 'Service quality 5/5');
  assert.equal(scoreChip('quality', 5), 'Hizmet kalitesi 5/5');
  assert.equal(ownReviewMeta({visitMonth: '2026-10', service: 'Fren'}, en, 'en-GB'), 'Visit: October 2026 · Fren');
  const seo = profileSeo(business(), en);
  assert.equal(seo.title, 'Örnek A · Kadıköy / İstanbul · Bodywork & Paint');
  assert.equal(seo.description, 'Örnek A, Kadıköy / İstanbul. Services: Kaporta. Phone, directions and reviews on Otosanayide.');
  assert.equal(profileSeo(business()).description, 'Örnek A, Kadıköy / İstanbul. Hizmetler: Kaporta. Telefon, yol tarifi ve yorumlar Otosanayide’de.');
});
