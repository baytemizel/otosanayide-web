import {SessionRequestError} from './session';

/** User-facing message for a failed /api/auth/* call made from the account screen. */
export function securityErrorMessage(error: unknown, fallback = 'İşlem tamamlanamadı. Tekrar dene.'): string {
  if (!(error instanceof SessionRequestError)) return fallback;
  switch (error.status) {
    case 400:
      return 'Kod veya bilgiler hatalı ya da süresi dolmuş.';
    case 401:
      return 'Oturum süresi doldu ya da bilgiler hatalı. Yeniden dene.';
    case 403:
      return 'Önce e-posta adresini doğrula.';
    case 404:
    case 405:
    case 501:
      return 'Bu işlem henüz kullanılamıyor.';
    case 429:
      return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
    default:
      return fallback;
  }
}

/** Secret shown in groups of four for manual entry; the value itself is unchanged. */
export function groupSecret(secret: string) {
  return secret.replace(/=+$/, '').match(/.{1,4}/g)?.join(' ') ?? '';
}

export const totpCode = /^[0-9]{6}$/;
