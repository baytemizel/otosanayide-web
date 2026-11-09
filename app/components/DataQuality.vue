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
  <div class="stack">
    <section class="notice">
      <strong class="row"><ShieldAlert :size="20"/>{{ i18nT('İnceleme kuyruğu hazır · Henüz yayında değil') }}</strong>
      <p>{{ format(report.total) }}{{ i18nT(' kaynak kayıt işlendi. Koordinat bulunması, konum veya işletme sahipliği doğrulaması değildir. Bu ekran yalnızca toplu sayıları gösterir.') }}</p>
    </section>
    <div class="quality-metrics">
      <section v-for="{label,value,Icon} in metrics" :key="label" class="panel"><component :is="Icon" :size="22"/><strong>{{ format(value) }}</strong><span>{{ i18nT(label) }}</span></section>
    </div>
    <section class="panel">
      <h2>{{ i18nT('İnceleme gerektiren alanlar') }}</h2>
      <p class="muted">{{ i18nT('Bir kayıtta birden fazla eksik olabilir. Bu sayılar toplanarak işletme sayısı hesaplanmaz.') }}</p>
      <div class="quality-flags">
        <div v-for="[key,count] in Object.entries(report.flags)" :key="key"><span>{{ i18nT(labels[key]??key) }}</span><strong>{{ format(count) }}</strong></div>
      </div>
    </section>
    <section class="panel">
      <div class="row between">
        <h2>{{ i18nT('Şehirlere göre hazırlık') }}</h2>
        <label class="quality-city">{{ i18nT('İl') }}<select v-model="city" :aria-label="i18nT('Veri raporu ili')"><option value="">{{ i18nT('Kapsamdaki tüm iller') }}</option><option v-for="r in report.cities" :key="r.city" :value="r.city">{{ r.city }}</option></select></label>
      </div>
      <div class="quality-table" role="region" :aria-label="i18nT('Şehir veri kalitesi')" tabindex="0">
        <table>
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
              <th scope="row">{{ r.city }}</th>
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
    <section class="panel">
      <h2>{{ i18nT('Yayın öncesi kontrol') }}</h2>
      <ol class="stack">
        <li>{{ i18nT('Kaynak kullanım hakkı ve özel servis kapsamını incele.') }}</li>
        <li>{{ i18nT('Mükerrer adaylarını birleştirmeden önce doğrula.') }}</li>
        <li>{{ i18nT('Adres, faaliyet ve harita noktasının güncelliğini denetle.') }}</li>
        <li>{{ i18nT('Yetkili yönetici kararıyla yayına al; sahiplik başvurusunu ayrı işle.') }}</li>
      </ol>
      <p class="small muted">{{ i18nT('Google Maps kaynaklı kanıt: ') }}{{ format(report.coordinateTypes.googleMaps) }}{{ i18nT(' · Rehber kaynaklı kanıt: ') }}{{ format(report.coordinateTypes.directory) }}{{ i18nT(' · Yandex Maps kaynaklı kanıt: ') }}{{ format(yandexMaps) }}{{ i18nT(' · Harita ve işletme pin mutabakatı: ') }}{{ format(ownerConsensus) }}{{ i18nT('. Otomatik yayımlanan: ') }}{{ report.published }}.</p>
      <details>
        <summary>{{ i18nT('Aktarım izini göster ') }}<ChevronDown :size="14"/></summary>
        <p class="small muted">{{ i18nT('Rapor: ') }}{{ report.generatedAt }}<br/>{{ i18nT('Kaynak SHA-256: ') }}<code>{{ report.inputSha256 }}</code><br/>{{ i18nT('Koordinat SHA-256: ') }}<code>{{ report.coordinatesSha256 }}</code></p>
      </details>
    </section>
  </div>
</template>
