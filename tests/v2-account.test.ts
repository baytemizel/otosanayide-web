import assert from 'node:assert/strict';
import {test} from 'node:test';
import {decodeProfile, profileChanges, readUnreadCount, unreadBadge} from '../app/lib/v2/account';
import {authErrorMessage, nameError, nameLabel, normalizeName, RESET_CODE} from '../app/lib/v2/auth';
import {SessionRequestError} from '../app/lib/session';

test('display name follows the API rule: 2–80 characters, starts with a letter, letters/space/\'/-/.', () => {
  assert.equal(nameError('Deniz Kaya'), '');
  assert.equal(nameError("Ayşe O'Neil-Şahin Jr."), '');
  assert.equal(nameError('  '), 'Adını ve soyadını yaz.');
  assert.equal(nameError('  ', false), '', 'the profile may clear the name');
  assert.match(nameError('D'), /2–80/);
  assert.match(nameError('1Deniz'), /harf/);
  assert.match(nameError('Deniz <b>'), /harf/);
  assert.match(nameError('a'.repeat(81)), /2–80/);
  assert.equal(normalizeName('  Deniz \t  Kaya '), 'Deniz Kaya');
});

test('the member label uses the name like the API DisplayName, else null (e-mail fallback stays in useSession)', () => {
  assert.deepEqual(nameLabel('Deniz Kaya'), {initials: 'DK', short: 'Deniz K.'});
  assert.deepEqual(nameLabel('deniz ali yılmaz'), {initials: 'DY', short: 'deniz Y.'});
  assert.deepEqual(nameLabel('İlkay'), {initials: 'İL', short: 'İlkay'});
  assert.equal(nameLabel(null), null);
  assert.equal(nameLabel('   '), null);
});

test('profile decoding tolerates unknown fields and reads an unknown locale as not chosen', () => {
  assert.deepEqual(decodeProfile({displayName: 'Deniz Kaya', locale: 'tr', email: 'd@example.test', emailVerified: true}), {displayName: 'Deniz Kaya', locale: 'tr'});
  assert.deepEqual(decodeProfile({displayName: null, locale: 'de'}), {displayName: null, locale: null});
  assert.deepEqual(decodeProfile({displayName: '  ', locale: null}), {displayName: null, locale: null});
  assert.throws(() => decodeProfile({displayName: 5}));
});

test('the profile PATCH carries only what changed; a cleared name is null', () => {
  const current = {displayName: 'Deniz Kaya', locale: 'tr' as const};
  assert.deepEqual(profileChanges(current, {displayName: 'Deniz Kaya', locale: 'tr'}), {});
  assert.deepEqual(profileChanges(current, {displayName: 'Deniz Yılmaz', locale: 'tr'}), {displayName: 'Deniz Yılmaz'});
  assert.deepEqual(profileChanges(current, {displayName: '', locale: 'en'}), {displayName: null, locale: 'en'});
  assert.deepEqual(profileChanges({displayName: null, locale: null}, {displayName: '', locale: null}), {});
});

test('unreadCount is read only from a v2 answer; the badge caps at 99+', () => {
  assert.equal(readUnreadCount({items: [], next: null, unreadCount: 3}), 3);
  assert.equal(readUnreadCount({items: [], next: null}), null, 'v1 answer');
  assert.equal(readUnreadCount({unreadCount: -1}), null);
  assert.equal(readUnreadCount({unreadCount: 1.5}), null);
  assert.equal(readUnreadCount(null), null);
  assert.equal(unreadBadge(7), '7');
  assert.equal(unreadBadge(120), '99+');
});

test('reset code is six digits and its errors are explained by status', () => {
  assert.ok(RESET_CODE.test('042917'));
  assert.ok(!RESET_CODE.test('42917'));
  assert.match(authErrorMessage('code', new SessionRequestError(400)), /hatalı ya da süresi dolmuş/);
  assert.match(authErrorMessage('code', new SessionRequestError(429)), /Çok fazla deneme/);
  assert.match(authErrorMessage('resetCode', new SessionRequestError(400)), /yeni kod/);
});
