import {apiFetch, setApiSessionHook} from './api';
import {createSessionService, type SessionService} from './session';

let instance: SessionService | null = null;

/** Browser only: a server-side singleton would share one user's session between requests. */
export function browserSession(): SessionService {
  if (typeof window === 'undefined') throw new Error('session_browser_only');
  if (instance) return instance;
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('otosanayide-session');
  const locks = 'locks' in navigator ? navigator.locks : null;
  const created = createSessionService({request: (path, init) => apiFetch(path, init), locks, channel});
  setApiSessionHook(token => created.renew(token));
  instance = created;
  return created;
}
