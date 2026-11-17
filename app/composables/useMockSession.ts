import {computed} from 'vue';
import {mockMember} from '~/data/mock/session';

/**
 * Mock sign-in state for the Web v2 screens. Nothing is sent anywhere; the flag lives in a
 * first-party cookie so server and client render the same navbar.
 */
export function useMockSession() {
  const cookie = useCookie<'1' | null>('v2-mock-member', {sameSite: 'lax', maxAge: 60 * 60 * 24 * 30});
  const signedIn = computed(() => cookie.value === '1');
  return {
    member: mockMember,
    signedIn,
    signIn: () => { cookie.value = '1'; },
    signOut: () => { cookie.value = null; },
  };
}
