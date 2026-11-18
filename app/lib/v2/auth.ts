import {securityErrorMessage} from '../account-security';
import {SessionRequestError} from '../session';

/** Password rule of the API (AUTH_API: at least 10 characters). */
export const PASSWORD_MIN = 10;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MFA_CODE = /^[0-9]{6}$/;

export type AuthAction = 'login' | 'mfa' | 'register' | 'forgot' | 'reset' | 'verify';

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
  }
}

/** Field errors of the sign-in / sign-up form (live rules). */
export function credentialErrors(email: string, password: string, signup: boolean) {
  const address = email.trim();
  return {
    email: !address ? 'E-posta adresini yaz.' : EMAIL_PATTERN.test(address) ? '' : 'Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).',
    password: !password ? (signup ? 'Bir şifre belirle.' : 'Şifreni yaz.') : signup && password.length < PASSWORD_MIN ? `Şifre en az ${PASSWORD_MIN} karakter olmalı.` : '',
  };
}
