// Explicit private evidence projection. Raw source history is never returned to clients.
export const qualityFieldLabels={currentness:'Güncel kaynak kaydı',address:'Adres',coordinates:'Koordinat',phone:'Telefon',email:'İşletme e-postası',website:'Web sitesi',google:'Google Maps teyidi'} as const;
export const qualityStatusLabels:Record<string,string>={
 'published-map-website-not-owner-verified':'Haritada yayımlanan web adresi; site kimliği ayrıca teyit edilmedi',
 'current-map-listing-not-operation-confirmation':'Güncel harita kaydı bulundu; faaliyet teyidi değildir',
 'owner-site-identity-matched':'İşletmenin web sitesi eşleşti',
 'identity-not-established':'İşletme eşleşmesi teyit bekliyor',
 'map-permanently-closed-needs-review':'Kalıcı kapalı harita kaydı incelenmeli',
 'ambiguous-branch-retained':'Şube eşleşmesi belirsiz; önceki bilgi korundu',
 'legacy-not-reconfirmed':'Önceki bilgi; yeniden teyit edilemedi',
 'missing':'Bilgi bulunamadı',
 'published-map-number-matched-not-called':'Haritada yayımlanan numara eşleşti; arama yapılmadı',
 'published-owner-number-matched-not-called':'İşletmenin yayımladığı numara eşleşti; arama yapılmadı',
 'source-conflict-retained':'Kaynaklar farklı; önceki bilgi korundu',
 'filled-from-identity-linked-map-not-called':'Eşleşen harita kaydından tamamlandı; arama yapılmadı',
 'filled-from-owner-contact-not-called':'İşletmenin yayımladığı iletişimden tamamlandı; arama yapılmadı',
 'updated-map-owner-consensus-not-called':'Harita ve işletme kaynağı mutabakatıyla güncellendi; arama yapılmadı',
 'identity-linked-map-address':'İşletmeyle eşleşen harita adresi',
 'updated-map-owner-address-consensus':'Harita ve işletme kaynağı adres mutabakatıyla güncellendi',
 'legacy-province-mismatch':'Önceki pin seçilen ilin dışında',
 'fresh-map-province-mismatch-rejected':'Yeni pin seçilen ilin dışında; reddedildi',
 'map-pin-corroborated-within-150m':'Harita pini önceki noktaya 150 metre içinde eşleşti',
 'filled-identity-linked-map-pin':'Eşleşen işletme harita piniyle tamamlandı',
 'updated-map-owner-pin-consensus':'Harita ve işletme kaynağı pin mutabakatıyla güncellendi',
 'identity-not-reconfirmed':'İşletmeyle yeniden eşleştirilemedi',
 'parked-or-default-quarantined':'Alan adı veya varsayılan hosting sayfası; kullanımdan ayrıldı',
 'unavailable-retained-for-review':'Erişilemedi; inceleme için korundu',
 'published-business-contact-not-delivery-tested':'Yayımlanan işletme iletişimi; e-posta gönderilmedi',
 'multiple-published-business-contacts-review':'Birden fazla işletme e-postası; seçim için incelenmeli',
 'multiple-published-business-contacts-primary-selected':'Birden fazla yayımlanan işletme e-postası; birincil adres seçildi, gönderim yapılmadı',
 'not-found-in-parsed-business-contacts':'İşletmeye ait e-posta teyit edilemedi',
 'not-verified-access-gap':'Erişim nedeniyle teyit edilemedi'
};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export function qualityEvidenceProjection(rawSource:unknown){
 const review=object(object(rawSource).quality_review);if(!['K165','K166'].includes(String(review.decision)))return null;
 const rawStatuses=object(review.statuses);
 const statuses=Object.keys(qualityFieldLabels).flatMap(field=>{const value=rawStatuses[field];return typeof value==='string'&&Object.hasOwn(qualityStatusLabels,value)?[{field:field as keyof typeof qualityFieldLabels,status:value}]:[];});
 const sources=Array.isArray(review.sources)?review.sources.filter((v):v is string=>typeof v==='string'&&v.length<=2000).flatMap(v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?[u.href]:[];}catch{return [];}}).slice(0,6):[];
 const checkedAt=typeof review.checkedAt==='string'&&/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(review.checkedAt)&&Number.isFinite(Date.parse(review.checkedAt))?review.checkedAt:null;
 return {checkedAt,internetAttempted:review.internetAttempted===true,googleVerified:false as const,statuses,sources};
}
