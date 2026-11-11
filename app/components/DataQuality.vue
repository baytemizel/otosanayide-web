<script setup lang="ts">
import {computed, ref} from 'vue';
import {ChevronDown, Database, Globe, Mail, MapPin, Phone, ShieldAlert} from '@lucide/vue';
import report from '~/data/import-quality.json';
import {useLocale} from '~/composables/useLocale';

const labels: Record<string, string> = {qc_district_conflict: 'İlçe kaynakları farklı', qc_shared_map_identity: 'Aynı harita kaydına bağlanan mükerrer adayları', qc_google_unverified: 'Google Maps teyidi açık', qc_source_unavailable: 'Kaynağa erişilemedi', qc_phone_conflict: 'Telefon kaynakları farklı', qc_coordinates_conflict: 'Koordinat kaynakları farklı', qc_address_conflict: 'Adres kaynakları farklı', qc_website_unavailable: 'Web sitesi kullanılamıyor', qc_website_identity_unconfirmed: 'Web sitesi işletmeyle eşleştirilemedi', qc_scope_unconfirmed: 'Tamir ve hizmet kapsamı teyit bekliyor', qc_no_identity_match: 'İşletme eşleşmesi teyit bekliyor', qc_closed_listing: 'Kalıcı kapalı kaydı incelenmeli', qc_not_checked_access_gap: 'Erişim nedeniyle kontrol tamamlanamadı', qc_coordinates_city_mismatch: 'Koordinat ile il uyuşmuyor', qc_email_invalid: 'İşletme e-postası biçimi incelenmeli', category_review: 'Kategori eşleştirmesi', coordinates_missing: 'Koordinat kanıtı eksik', coordinates_invalid: 'Geçersiz koordinat', coordinates_outside_turkey_envelope: 'Türkiye sınır aralığı dışında', duplicate_candidate: 'Mükerrer adayı', encoding_review: 'Karakter kodlaması', missing_address: 'Adres eksik', missing_district: 'İlçe eksik', phone_invalid: 'Telefon biçimi incelenmeli', phone_missing: 'Telefon eksik', possibly_closed: 'Kapanmış olabilecek kayıt', scope_review: 'Özel servis kapsamı incelenmeli', website_invalid: 'Web adresi biçimi incelenmeli', source_missing_or_invalid: 'Kaynak bağlantısı incelenmeli'};

const {t: i18nT, localeTag} = useLocale();
const format = (n: number) => n.toLocaleString(localeTag.value);
const city = ref('');
const rows = computed(() => report.cities.filter(r => !city.value || r.city === city.value));
const metrics = [
  {label: 'Kaynak kayıt', value: report.total, Icon: Database},
  {label: 'Koordinat kanıtı', value: report.coordinateEvidence, Icon: MapPin},
  {label: 'Biçimi uygun telefon', value: report.phone, Icon: Phone},
  {label: 'Biçimi uygun web adresi', value: report.website, Icon: Globe},
  {label: 'Biçimi uygun işletme e-postası', value: (report as typeof report & {email?: number}).email ?? 0, Icon: Mail},
];
const rowEmail = (r: (typeof report.cities)[number]) => (r as typeof r & {email?: number}).email ?? 0;
const yandexMaps = (report.coordinateTypes as typeof report.coordinateTypes & {yandexMaps?: number}).yandexMaps ?? 0;
const ownerConsensus = (report.coordinateTypes as typeof report.coordinateTypes & {ownerConsensus?: number}).ownerConsensus ?? 0;
</script>

<template>
  <div class="ds-col ds-g20">
    <section class="ds-note warn">
      <ShieldAlert class="ds-i" :size="18"/>
      <div class="ds-col ds-g4 ds-f1">
        <strong>{{ i18nT('İnceleme kuyruğu hazır · Henüz yayında değil') }}</strong>
        <span>{{ format(report.total) }}{{ i18nT(' kaynak kayıt işlendi. Koordinat bulunması, konum veya işletme sahipliği doğrulaması değildir. Bu ekran yalnızca toplu sayıları gösterir.') }}</span>
      </div>
    </section>
    <div class="metrics">
      <section v-for="{label,value,Icon} in metrics" :key="label" class="ds-kpi">
        <div class="ds-row ds-sb ds-g8"><span class="ds-small ds-muted">{{ i18nT(label) }}</span><component :is="Icon" class="ds-i ds-muted" :size="18"/></div>
        <div class="v">{{ format(value) }}</div>
      </section>
    </div>
    <section class="ds-card ds-pad24 ds-col ds-g12">
      <h3 style="margin:0">{{ i18nT('İnceleme gerektiren alanlar') }}</h3>
      <div class="ds-small ds-muted">{{ i18nT('Bir kayıtta birden fazla eksik olabilir. Bu sayılar toplanarak işletme sayısı hesaplanmaz.') }}</div>
      <div class="flags">
        <div v-for="[key,count] in Object.entries(report.flags)" :key="key" class="ds-row ds-sb ds-g16 ds-small flag"><span>{{ i18nT(labels[key]??key) }}</span><strong class="ds-orange">{{ format(count) }}</strong></div>
      </div>
    </section>
    <section class="ds-card" style="overflow:hidden">
      <div class="ds-row ds-sb ds-wrap ds-g12 ds-pad">
        <h3 style="margin:0">{{ i18nT('Şehirlere göre hazırlık') }}</h3>
        <label class="ds-row ds-g10 ds-small ds-b">{{ i18nT('İl') }}<select v-model="city" class="ds-field" style="min-width:180px" :aria-label="i18nT('Veri raporu ili')"><option value="">{{ i18nT('Kapsamdaki tüm iller') }}</option><option v-for="r in report.cities" :key="r.city" :value="r.city">{{ r.city }}</option></select></label>
      </div>
      <div class="ds-table-wrap" role="region" :aria-label="i18nT('Şehir veri kalitesi')" tabindex="0">
        <table class="ds-table">
          <thead>
            <tr>
              <th>{{ i18nT('İl') }}</th>
              <th>{{ i18nT('Kayıt') }}</th>
              <th>{{ i18nT('Koordinat kanıtı') }}</th>
              <th>{{ i18nT('Telefon') }}</th>
              <th>{{ i18nT('Web adresi') }}</th>
              <th>{{ i18nT('İşletme e-postası') }}</th>
              <th>{{ i18nT('İnceleme işareti olan') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.city">
              <th scope="row" class="city">{{ r.city }}</th>
              <td>{{ format(r.total) }}</td>
              <td>{{ format(r.coordinateEvidence) }}</td>
              <td>{{ format(r.phone) }}</td>
              <td>{{ format(r.website) }}</td>
              <td>{{ format(rowEmail(r)) }}</td>
              <td>{{ format(r.reviewFlags) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section class="ds-card ds-pad24 ds-col ds-g12">
      <h3 style="margin:0">{{ i18nT('Yayın öncesi kontrol') }}</h3>
      <ol class="ds-col ds-g8 ds-small" style="margin:0;padding-left:20px">
        <li>{{ i18nT('Kaynak kullanım hakkı ve özel servis kapsamını incele.') }}</li>
        <li>{{ i18nT('Mükerrer adaylarını birleştirmeden önce doğrula.') }}</li>
        <li>{{ i18nT('Adres, faaliyet ve harita noktasının güncelliğini denetle.') }}</li>
        <li>{{ i18nT('Yetkili yönetici kararıyla yayına al; sahiplik başvurusunu ayrı işle.') }}</li>
      </ol>
      <div class="ds-xs ds-muted">{{ i18nT('Google Maps kaynaklı kanıt: ') }}{{ format(report.coordinateTypes.googleMaps) }}{{ i18nT(' · Rehber kaynaklı kanıt: ') }}{{ format(report.coordinateTypes.directory) }}{{ i18nT(' · Yandex Maps kaynaklı kanıt: ') }}{{ format(yandexMaps) }}{{ i18nT(' · Harita ve işletme pin mutabakatı: ') }}{{ format(ownerConsensus) }}{{ i18nT('. Otomatik yayımlanan: ') }}{{ report.published }}.</div>
      <details class="ds-small">
        <summary class="ds-b" style="cursor:pointer">{{ i18nT('Aktarım izini göster ') }}<ChevronDown :size="14" style="display:inline;vertical-align:middle"/></summary>
        <div class="ds-xs ds-muted" style="margin-top:8px;overflow-wrap:anywhere">{{ i18nT('Rapor: ') }}{{ report.generatedAt }}<br/>{{ i18nT('Kaynak SHA-256: ') }}<code>{{ report.inputSha256 }}</code><br/>{{ i18nT('Koordinat SHA-256: ') }}<code>{{ report.coordinatesSha256 }}</code></div>
      </details>
    </section>
  </div>
</template>

<style scoped>
.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.flags{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px}
.flag{justify-content:space-between;padding:12px 0;border-bottom:1px solid #edf0f3}
.ds-table .city{background:none;text-transform:none;letter-spacing:0;font-size:14px;color:#10243a;border-bottom:1px solid #edf0f3}
@media(max-width:1100px){.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.flags{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.metrics{grid-template-columns:minmax(0,1fr)}}
</style>
