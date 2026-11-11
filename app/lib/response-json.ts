/**
 * Body of an API answer for panels that read `{error}` themselves. A proxy or maintenance
 * page (HTML, empty body) no longer surfaces as "Unexpected token <": an error answer always
 * carries a readable `error`, and a success that is not JSON is an error of its own.
 */
export const unreadableAnswer = 'Sunucu yanıtı beklenen biçimde değil. Sayfayı yenile; sürerse yöneticiye bildir.';

export function statusMessage(status: number) {
  if (status === 401) return 'Oturum süresi doldu. Yeniden giriş yap.';
  if (status === 403) return 'Bu işlem için yetkiniz yok.';
  if (status === 404) return 'Kayıt bulunamadı.';
  if (status === 409) return 'Kayıt değişti. Sayfayı yenile.';
  if (status === 429) return 'Çok fazla istek gönderildi. Biraz sonra tekrar dene.';
  if (status === 503) return 'Bu özellik henüz etkin değil.';
  return 'İşlem tamamlanamadı. Tekrar dene.';
}

export async function responseJson(response: Response): Promise<any> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    /* treated as an empty body */
  }
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const record = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const error = typeof record.error === 'string' && record.error ? record.error.slice(0, 300) : statusMessage(response.status);
    return {...record, error};
  }
  if (body === undefined) throw new Error(unreadableAnswer);
  return body;
}
