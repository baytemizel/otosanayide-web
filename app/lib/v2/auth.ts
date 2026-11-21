import {securityErrorMessage} from '../account-security';
import {SessionRequestError} from '../session';

/** Password rule of the API (AUTH_API: at least 10 characters). */
export const PASSWORD_MIN = 10;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MFA_CODE = /^[0-9]{6}$/;
/** v2-04 password reset code: 6 digits, 10 minutes, one per account; a new one replaces the old. */
export const RESET_CODE = MFA_CODE;
/** The API answers 429 to a new code within this many seconds for the same address. */
export const RESET_CODE_RESEND_SECONDS = 60;

export type AuthAction = 'login' | 'mfa' | 'register' | 'forgot' | 'reset' | 'verify' | 'code' | 'resetCode';

/** ?donus=… only when it is a path on this site ("/x", never "//host" or "/\host"). */
export function returnPath(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null;
}

/** User-facing message for a failed /api/auth/* call, chosen by status code (never the API text). */
export function authErrorMessage(action: AuthAction, error: unknown): string {
  const status = error instanceof SessionRequestError ? error.status : 0;
  if (status === 429) return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  switch (action) {
    case 'login':
      if (status === 401 || status === 400) return 'E-posta adresi veya şifre hatalı.';
      if (status === 403) return 'Bu adresten giriş yapılamıyor. Sayfayı yenileyip tekrar dene.';
      return status ? securityErrorMessage(error, 'Giriş tamamlanamadı. Tekrar dene.') : 'Giriş tamamlanamadı. Bilgilerini ve bağlantını kontrol et.';
    case 'mfa':
      if (status === 400 || status === 401) return 'Kod doğrulanamadı ya da süresi doldu. Kodu kontrol et; gerekirse girişi baştan yap.';
      return 'Kod doğrulanamadı. Bağlantını kontrol edip tekrar dene.';
    case 'register':
      if (status === 400) return `E-posta adresini ve en az ${PASSWORD_MIN} karakterlik şifreni kontrol et.`;
      return status ? securityErrorMessage(error, 'Hesap oluşturulamadı. Tekrar dene.') : 'Hesap oluşturulamadı. Bilgilerini ve bağlantını kontrol et.';
    case 'forgot':
      if (status === 400) return 'E-posta adresini kontrol et.';
      return 'Kurtarma e-postası istenemedi. Bağlantını kontrol edip tekrar dene.';
    case 'reset':
      if (status === 400) return `Bağlantı geçersiz ya da süresi dolmuş olabilir; şifren en az ${PASSWORD_MIN} karakter olmalı.`;
      return status ? securityErrorMessage(error, 'Şifre güncellenemedi. Tekrar dene.') : 'Şifre güncellenemedi. Bağlantını kontrol edip tekrar dene.';
    case 'verify':
      return 'Bağlantı geçersiz ya da süresi dolmuş.';
    case 'code':
      if (status === 400) return 'Kod hatalı ya da süresi dolmuş. Kodu kontrol et ya da yeni kod iste.';
      return 'Kod doğrulanamadı. Bağlantını kontrol edip tekrar dene.';
    case 'resetCode':
      if (status === 400) return `Doğrulamanın süresi dolmuş olabilir; şifren en az ${PASSWORD_MIN} karakter olmalı. Gerekirse yeni kod iste.`;
      return status ? securityErrorMessage(error, 'Şifre güncellenemedi. Tekrar dene.') : 'Şifre güncellenemedi. Bağlantını kontrol edip tekrar dene.';
  }
}

/* ---------------------------------------------------------------- display name (v2-04) */

/** The API's display-name rule: 2–80 characters, starts with a letter; letters, spaces, ' - . only. */
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} '.\-]*$/u;
export const NAME_MAX = 80;

/** Trimmed, single-spaced and NFC, as the API stores it. */
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').normalize('NFC');

/** Field error for a full name ('' when valid). `required` follows the screen: sign-up asks for it, /hesabim may clear it. */
export function nameError(value: string, required = true) {
  const name = normalizeName(value);
  if (!name) return required ? 'Adını ve soyadını yaz.' : '';
  if (name.length < 2 || name.length > NAME_MAX || !NAME_PATTERN.test(name)) return `Ad soyad 2–${NAME_MAX} karakter olmalı; harf, boşluk, kesme, tire ve nokta kullanılabilir.`;
  return '';
}

/** Avatar initials and short name from a full name, like the API's DisplayName ("Deniz Kaya" → DK, "Deniz K."). */
export function nameLabel(full: string | null | undefined): {initials: string; short: string} | null {
  const parts = (full ?? '').trim().split(/\s+/u).filter(Boolean);
  if (!parts.length) return null;
  const first = [...parts[0]!].slice(0, 40).join('');
  const last = parts.length > 1 ? parts[parts.length - 1]! : '';
  const initials = (parts.length === 1 ? [...first].slice(0, 2).join('') : [...first][0]! + [...last][0]!).toLocaleUpperCase('tr-TR');
  return {initials, short: last ? `${first} ${[...last][0]!.toLocaleUpperCase('tr-TR')}.` : first};
}

/** Field errors of the sign-in / sign-up form (live rules). */
export function credentialErrors(email: string, password: string, signup: boolean) {
  const address = email.trim();
  return {
    email: !address ? 'E-posta adresini yaz.' : EMAIL_PATTERN.test(address) ? '' : 'Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).',
    password: !password ? (signup ? 'Bir şifre belirle.' : 'Şifreni yaz.') : signup && password.length < PASSWORD_MIN ? `Şifre en az ${PASSWORD_MIN} karakter olmalı.` : '',
  };
}
