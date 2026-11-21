import {computed, ref, watch} from 'vue';
import {mockMember} from '~/data/mock/session';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {callApi} from '~/lib/api-read';
import {demoMode} from '~/lib/env';
import {turkish, type Translate} from '~/lib/i18n';
import {browserSession} from '~/lib/session-instance';
import type {LoginResult, RegisterDetails} from '~/lib/session';
import {decodeProfile, type MemberProfile, type ProfileLocale} from '~/lib/v2/account';
import {nameLabel} from '~/lib/v2/auth';
import {liveErrorMessage} from '~/lib/v2/requests';

/** Initials and a short label from an e-mail address (used while the account has no display name). */
export function memberLabel(email: string | null | undefined, t: Translate = turkish) {
  const local = (email ?? '').split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toLocaleUpperCase('tr-TR') || '?';
  const short = parts.length ? parts.map((p, i) => (i === 0 ? p[0].toLocaleUpperCase('tr-TR') + p.slice(1) : `${p[0].toLocaleUpperCase('tr-TR')}.`)).join(' ') : t('Hesabım');
  return {initials, short};
}

type StoredProfile = MemberProfile & {uid: string};

/* Live: GET /api/me/profile once per signed-in account, shared by every screen (browser only). */
let profileFor: string | null = null;
let profileFailedAt = 0;
const PROFILE_RETRY_MS = 60_000;

function useStoredProfile() {
  return useState<StoredProfile | null>('v2-member-profile', () => null);
}

/**
 * The signed-in member for the v2 screens. Live mode: the /api/auth session held by the app store, and the
 * display name from /api/me/profile (v2-04) for the navbar and account menu; without a name the label falls
 * back to the e-mail-based one. Demo mode: the local preview membership (no network), shown as "Deniz K.".
 */
export function useSession() {
  const app = useApp();
  const {t} = useLocale();
  const demo = demoMode();
  const stored = useStoredProfile();
  const signedIn = computed(() => app.member);
  const ready = computed(() => app.ready);
  const email = computed(() => (demo ? mockMember.email : app.user?.email ?? ''));
  const emailVerified = computed(() => (demo ? true : app.user?.emailVerified ?? false));
  /** Live profile of the current account, or null until it is read (or when it could not be). */
  const profile = computed<MemberProfile | null>(() => (!demo && stored.value && stored.value.uid === app.user?.uid ? stored.value : null));
  const displayName = computed(() => (demo ? mockMember.name : profile.value?.displayName ?? null));
  const label = computed(() => (demo ? {initials: mockMember.initials, short: mockMember.shortName} : nameLabel(displayName.value) ?? memberLabel(email.value, t)));

  if (!demo && import.meta.client) {
    watch(() => app.user?.uid ?? null, (uid) => {
      if (!uid) {
        profileFor = null;
        stored.value = null;
        return;
      }
      if (profileFor === uid || (stored.value?.uid === uid) || Date.now() - profileFailedAt < PROFILE_RETRY_MS) return;
      profileFor = uid;
      const user = app.user;
      void (async () => {
        try {
          const value = await callApi('/api/me/profile', {token: await user!.getIdToken()}, decodeProfile);
          if (app.user?.uid === uid) stored.value = {uid, ...value};
        } catch {
          // The label keeps its e-mail-based fallback; /hesabim shows its own error.
          profileFailedAt = Date.now();
          if (profileFor === uid) profileFor = null;
        }
      })();
    }, {immediate: true});
  }

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
  async function register(address: string, password: string, details: RegisterDetails = {}) {
    if (demo) {
      app.loginDemo();
      return;
    }
    await browserSession().register(address, password, details);
  }
  async function signOut() {
    await app.logout();
  }

  return {demo, signedIn, ready, email, emailVerified, profile, displayName, label, signIn, verifyMfa, register, signOut};
}

/**
 * /hesabim "Profil" card (live): reads the profile (again, so the form starts from the server's value) and
 * saves name and language with PATCH /api/me/profile. The saved answer updates the navbar label too.
 */
export function useMemberProfile() {
  const app = useApp();
  const {t} = useLocale();
  const stored = useStoredProfile();
  const loading = ref(false);
  const busy = ref(false);
  const error = ref('');
  const saved = ref('');

  async function token() {
    const user = app.user;
    if (!user) throw Error(t('Oturumun sona erdi. Yeniden giriş yap.'));
    return {uid: user.uid, token: await user.getIdToken()};
  }

  async function load() {
    if (demoMode() || !app.user || loading.value) return;
    loading.value = true;
    error.value = '';
    try {
      const {uid, token: bearer} = await token();
      const value = await callApi('/api/me/profile', {token: bearer}, decodeProfile);
      if (app.user?.uid === uid) {
        stored.value = {uid, ...value};
        profileFor = uid;
      }
    } catch (e) {
      error.value = profileErrorMessage(e, t('Profil bilgileri yüklenemedi.'), t);
    } finally {
      loading.value = false;
    }
  }

  async function save(changes: {displayName?: string | null; locale?: ProfileLocale | null}) {
    if (busy.value || !Object.keys(changes).length) return false;
    busy.value = true;
    error.value = '';
    saved.value = '';
    try {
      const {uid, token: bearer} = await token();
      const value = await callApi('/api/me/profile', {method: 'PATCH', token: bearer, body: changes}, decodeProfile);
      if (app.user?.uid === uid) stored.value = {uid, ...value};
      saved.value = t('Profil bilgilerin kaydedildi.');
      return true;
    } catch (e) {
      error.value = profileErrorMessage(e, t('Profil bilgileri kaydedilemedi. Tekrar dene.'), t);
      return false;
    } finally {
      busy.value = false;
    }
  }

  return {loading, busy, error, saved, load, save};
}

/** `fallback` comes translated; the API's own text is shown as sent (the API localises it). */
function profileErrorMessage(error: unknown, fallback: string, t: Translate) {
  return liveErrorMessage(error, fallback, {
    400: t('Bilgileri kontrol et: ad soyad 2–80 karakter olmalı ve harfle başlamalı.'),
    409: t('Hesap silme talebin işlenirken profil değiştirilemez.'),
  }, t);
}
