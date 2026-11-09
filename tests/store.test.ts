import assert from 'node:assert/strict';
import {beforeEach, test} from 'node:test';
import {createPinia, setActivePinia} from 'pinia';
import {configureEnv} from '../app/lib/env';
import {useAppStore} from '../app/stores/app';

const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value)},
});

beforeEach(() => {
  memory.clear();
  configureEnv({appMode: 'demo'});
  setActivePinia(createPinia());
});

const settled = () => new Promise(resolve => setTimeout(resolve, 0));
const vehicle = {brand: 'Fiat', model: 'Egea', year: 2020, fuel: 'Benzin', mileage: 1000};

test('demo starts signed out and becomes ready without any session service', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  assert.equal(store.ready, true);
  assert.equal(store.member, false);
  assert.equal(store.user, null);
});

test('demo login persists preview data locally and logout keeps it', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  store.loginDemo();
  assert.equal(store.member, true);
  await store.save('vehicles', vehicle);
  assert.equal(store.data.vehicles.length, 1);
  await store.logout();
  assert.equal(store.member, false);
  assert.equal(store.data.vehicles.length, 1);
});

test('writes are refused for a visitor who is not a member', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  await assert.rejects(store.save('vehicles', vehicle), /giriş yap/);
});

test('only one account write can run at a time', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  store.loginDemo();
  const first = store.save('vehicles', vehicle);
  await assert.rejects(store.save('vehicles', vehicle), /işlem sürüyor/);
  await first;
});

test('accountGuard rejects once the session has changed', () => {
  const store = useAppStore();
  store.start();
  const guard = store.accountGuard('u1');
  assert.throws(guard, /Oturum değişti/);
});

test('stop raises the session fence for captured guards', () => {
  const store = useAppStore();
  store.start();
  const guard = store.accountGuard('u1');
  store.stop();
  assert.throws(guard, /Oturum değişti/);
});
