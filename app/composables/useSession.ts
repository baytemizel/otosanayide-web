import {computed} from 'vue';
import {mockMember} from '~/data/mock/session';
import {useApp} from '~/composables/useApp';
import {demoMode} from '~/lib/env';
import {browserSession} from '~/lib/session-instance';
import type {LoginResult} from '~/lib/session';

/** Initials and a short label from an e-mail address (the API has no display name). */
export function memberLabel(email: string | null | undefined) {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toLocaleUpperCase('tr-TR') || '?';
  const short = parts.length ? parts.map((p, i) => (i === 0 ? p[0].toLocaleUpperCase('tr-TR') + p.slice(1) : `${p[0].toLocaleUpperCase('tr-TR')}.`)).join(' ') : 'Hesabım';
  return {initials, short};
}

/**
 * The signed-in member for the v2 screens. Live mode: the /api/auth session held by the app store.
 * Demo mode: the local preview membership (no network), shown as the synthetic "Deniz K.".
 */
export function useSession() {
  const app = useApp();
  const demo = demoMode();
  const signedIn = computed(() => app.member);
  const ready = computed(() => app.ready);
  const email = computed(() => (demo ? mockMember.email : app.user?.email ?? ''));
  const emailVerified = computed(() => (demo ? true : app.user?.emailVerified ?? false));
  const label = computed(() => (demo ? {initials: mockMember.initials, short: mockMember.shortName} : memberLabel(email.value)));

  async function signIn(address: string, password: string): Promise<LoginResult | {status: 'demo'}> {
    if (demo) {
      app.loginDemo();
      return {status: 'demo'};
    }
    return browserSession().login(address, password);
  }
  async function verifyMfa(challenge: string, code: string) {
    await browserSession().verifyMfa(challenge, code);
  }
  async function register(address: string, password: string) {
    if (demo) {
      app.loginDemo();
      return;
    }
    await browserSession().register(address, password);
  }
  async function signOut() {
    await app.logout();
  }

  return {demo, signedIn, ready, email, emailVerified, label, signIn, verifyMfa, register, signOut};
}
