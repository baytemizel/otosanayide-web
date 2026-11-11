# Figma hedef arayüzü uygulama kuralları (K169)

Figma: `qeosWGQzRbPlMJrcTbt3sj`. Web'in görünümü bu dosyayı izler. Kullanıcı kararı: 53 web ekranı uygulanır, API'si olmayan öğeler **pasif** gösterilir.

## Kaynak ve sıra

1. Figma araçları ertelenmiş olabilir: `ToolSearch` ile `mcp__dc3f53ad-468e-4986-bbf6-5223ada217fc__get_design_context` ve `get_screenshot` şemalarını yükle. `figma:figma-design-to-code` skill'ini ilk `get_design_context` çağrısından önce yükle ve `skillNames` parametresine ekle.
2. Her Figma çağrısında `sessionId=2862109a-2ea3-4d42-96b1-6d398c218079`, `fileKey=qeosWGQzRbPlMJrcTbt3sj`, `clientFrameworks=vue`.
3. Ekran başına önce `get_design_context` (ekran görüntüsüyle). Yanıt seyrekse görünür alt düğümleri iste. Figma kota veya hata verirse ekranı `get_screenshot` ve üretici şablonla tamamla, raporla.
4. Üretici şablonlar yapı ve ölçü için yardımcıdır: `design/figma/revision-k169/generators/p02.py … p08.py`, `common.py`. Figma güncellemeleri (K169-A1) şablonda olmayabilir; çelişkide Figma kazanır.

## Değişmeyecekler (kesin)

- `<script setup>` içindeki API çağrıları, `accountGuard`, oturum çiti, iptal bayrakları, Zod ayrıştırıcıları, doğrulamalar, hata mesajları, kontrol sırası, FormData alan adları (`name`). Yalnız görünüm için gereken küçük durum (sekme, açık/kapalı) eklenebilir.
- `apiFetch`, `apiUrl`, `useApp`, `useLocale`, `useClientEffect` kullanımı (`docs/REACT_TO_VUE.md`). `v-default-value` kuralı geçerli: FormData alanına dinamik `:value` verme.
- Kaynakta olup Figma'da olmayan **işlev silinmez**: ortak garaj, yönetim sekmeleri, marka sponsorlukları vb. kalır, `ds-*` bileşenleriyle biçimlenip mantıklı yere konur.
- Yalnız sana verilen dosyaları değiştir. Temel dosyalar (`Shell`, `BrandLogo`, `LanguageSwitch`, `PanelShell`, `design.css`, `app/lib`, `nuxt.config.ts`) değişmez; eksik varsa raporla. Paket kurma, derleme veya sunucu çalıştırma; başka görevler aynı anda yazıyor. Kendi SFC'lerini `@vue/compiler-sfc` ile bellekte derleyip denetleyebilirsin (betik scratchpad'de kalır).

## Veri dürüstlüğü

- Figma'daki örnek ad, sayı, puan, tarih ve fotoğraflar **koda girmez**. Gerçek veri veya kaynaktaki boş durum gösterilir.
- Veri yoksa uydurma: saat bilinmiyorsa açık denmez (“Saat bilgisi yok”), yorum yoksa sıfır yıldız değil “Henüz yorum yok”, doğrulama rozeti yalnız `ownership==='verified'`, sponsorlu içerik daima etiketli.

## Pasif öğeler

API'si veya verisi olmayan Figma öğesi ekranda görünür ama çalışmaz:

- Buton/alan: `disabled`, `aria-disabled="true"`, `:title="i18nT('Yakında')"`, görünüm için `ds-passive` sınıfı. Bağlantı ise `<span class="ds-passive" aria-disabled="true">`.
- Filtre sayıları gibi verisi olmayan değerler gösterilmez; satır pasif kalır.
- Gerçek bir `disabled` durumu (`busy` vb.) ile karışmasın. Pasif öğe form gönderiminde `name` taşımasın.
- Sonuç raporunda pasif bıraktıklarını ekran kodlarıyla listele.

## Stil

- Paylaşılan stiller `app/assets/css/design.css`: `.ds-btn(.p .s .n .g .d .sm .lg)`, `.ds-chip(.o .line .on)`, `.ds-badge(.ok .warn .err .info .neu .sp)`, `.ds-card`, `.ds-field`, `.ds-label`, `.ds-help`, `.ds-check`, `.ds-radio`, `.ds-switch`, `.ds-tabs`, `.ds-seg`, `.ds-note(.warn .info .err .ok)`, `.ds-steps/.ds-step`, `.ds-kpi`, `.ds-table`, `.ds-table-wrap`, `.ds-row`, `.ds-col`, `.ds-g4…g40`, `.ds-sb`, `.ds-wrap`, `.ds-f1`, `.ds-muted`, `.ds-small`, `.ds-xs`, `.ds-b`, `.ds-orange`, `.ds-green`, `.ds-red`, `.ds-pad/.ds-pad16/.ds-pad24`, `.ds-surface`, `.ds-divider`, `.ds-container`, `.ds-modal-scrim > .ds-modal`, `.ds-serif`, `.ds-mapbg`.
- Bileşene özel stil `<style scoped>`. Sabit değerler Figma değişkenleriyle aynı: navy `#10243a`, orange `#c4460b`/`#f36b21`, muted `#586879`, line `#dfe5eb`, surface `#f4f6f8`. Tailwind kurma.
- Mutlak konumlu Figma çıktısını akışa çevir. Sayfalar 1440 masaüstünden 390 mobile taşmadan uyumlu: 1100/760/480 kırılımları, yatay kaydırma yok. Mobil için `MW*` ekranları hedeftir.
- Odak görünür, etiketler ve aria korunur.
- İkonlar `@lucide/vue`, kategori simgeleri `ServiceSymbol`. Statik görsel gerekiyorsa `public/figma/<grup>/` altına indir; geçici Figma adresi kodda kalmaz. API'den gelen görseller dinamik kalır.

## Metin

- Figma'da açıkça görünen başlık ve etiketler kullanılır; aksi halde kaynak metin kalır. Tüm görünür metin `i18nT(...)`/`t(...)` içinden geçer.
- `packages/core/locales/en.json` içinde olmayan her yeni Türkçe metnin İngilizcesini `app/locales/<grup>.json` dosyasına yaz (grup adı görevinde verilir).

## Sonuç

En çok 20 satır: değişen dosya sayısı, uygulanan ekran kodları, pasif bırakılanlar, Figma'dan sapmalar ve nedeni, temel dosyalarda eksikler, yapılan denetim. Dosya içeriği yazma.
