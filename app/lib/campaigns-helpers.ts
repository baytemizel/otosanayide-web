import type {CampaignView} from '@otosanayide/core/campaigns';

export const campaignLabels = {draft: 'Taslak', pending: 'İncelemede', approved: 'Onaylandı · Ödeme Bekliyor', rejected: 'Reddedildi', cancelled: 'İptal Edildi', scheduled: 'Ödemesi Doğrulandı · Zamanlandı'};

export type CampaignBranch = {id: string; name: string; city: string; categories: string[]};

export function newCampaign(b: CampaignBranch, id: string): CampaignView {
  return {id, businessId: b.id, placement: 'search', city: b.city, category: b.categories[0] ?? '', days: 7, startDate: new Date(Date.now() + 27 * 3600000).toISOString().slice(0, 10), headline: '', description: '', status: 'draft', version: 0, reason: '', createdAtMs: 0, updatedAtMs: 0};
}
