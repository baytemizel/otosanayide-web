import {z} from 'zod';
import {apiFetch} from './api';

/** S08 "Yanlış bilgi bildir" — proposed contract, endpoint request web-04. */
export const reportReasons = ['closed', 'moved', 'phone', 'address', 'location', 'hours', 'services', 'other'] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportReasonLabels: Record<ReportReason, string> = {
  closed: 'İşletme kapanmış',
  moved: 'İşletme taşınmış',
  phone: 'Telefon yanlış',
  address: 'Adres yanlış',
  location: 'Harita konumu yanlış',
  hours: 'Çalışma saatleri yanlış',
  services: 'Hizmetler yanlış',
  other: 'Diğer',
};

export const reportInput = z.object({
  reason: z.enum(reportReasons),
  note: z.string().trim().max(1000),
}).strict().refine(v => v.reason !== 'other' || v.note.length >= 10, {message: 'note_required'});

const reportResult = z.object({id: z.string().uuid(), status: z.literal('submitted')}).passthrough();

export class ReportError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function messageFor(status: number) {
  if (status === 401) return 'Bildirim göndermek için giriş yap.';
  if (status === 403) return 'Bildirim göndermek için e-posta adresini doğrula.';
  if (status === 404) return 'Bu işletme için bildirim alınamıyor.';
  if (status === 409) return 'Bu işletme için açık bir bildirimin zaten var.';
  if (status === 429) return 'Çok fazla bildirim gönderdin. Daha sonra tekrar dene.';
  if (status === 400) return 'Bildirimi kontrol et. “Diğer” için en az 10 karakter açıklama yaz.';
  return 'Bildirim gönderilemedi. Daha sonra tekrar dene.';
}

export async function submitBusinessReport(businessId: string, input: {reason: ReportReason; note: string}, token: string, operationId: string) {
  const value = reportInput.parse(input);
  const response = await apiFetch(`/api/businesses/${encodeURIComponent(businessId)}/reports`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token},
    body: JSON.stringify({...value, operationId}),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) {
    // web-04: a 400 explains what the note may not contain; that text is shown as the API wrote it.
    let detail = '';
    if (response.status === 400) {
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') detail = body.error.slice(0, 300);
      } catch {
        /* fixed message below */
      }
    }
    throw new ReportError(response.status, detail || messageFor(response.status));
  }
  return reportResult.parse(await response.json());
}
