<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Bell, CalendarDays, Camera, ChartColumn, CreditCard, FileText, House, Inbox, Info, LayoutGrid, LockKeyhole, MapPin, Megaphone, MessageSquare, Plus, ShieldCheck, ToggleRight, Users, Wrench} from '@lucide/vue';
import {cities, claimSchema} from '@otosanayide/core';
import BusinessLocation from '~/components/BusinessLocation.vue';
import BusinessPhotoPanel from '~/components/BusinessPhotoPanel.vue';
import BusinessProfileEditor from '~/components/BusinessProfileEditor.vue';
import BusinessReplies from '~/components/BusinessReplies.vue';
import Campaigns from '~/components/Campaigns.vue';
import ClaimTracker from '~/components/ClaimTracker.vue';
import FeatureActivation from '~/components/FeatureActivation.vue';
import ManagedBusinessProfile from '~/components/ManagedBusinessProfile.vue';
import PanelShell from '~/components/PanelShell.vue';
import RequestBoard from '~/components/RequestBoard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {PanelNavItem} from '~/lib/panel';

const {t: i18nT} = useLocale();
const app = useApp();
const route = useRoute();
const businessId = ref('');
const claimRevision = ref(0);
const tab = ref('Genel bakış');
const claim = ref(false);
const error = ref('');
const busy = ref(false);
const nav: PanelNavItem[] = [
  {section: 'Şube'},
  {value: 'Genel bakış', label: 'Genel bakış', icon: LayoutGrid},
  {value: 'Profilim', label: 'Profilim', icon: House},
  {value: 'Konum ve saatler', label: 'Konum ve saatler', icon: MapPin},
  {value: 'Fotoğraflar', label: 'Fotoğraflar', icon: Camera},
  {value: 'Hizmetler ve markalar', label: 'Hizmetler ve markalar', icon: Wrench, passive: true},
  {section: 'Müşteri'},
  {value: 'Yorumlar', label: 'Yorumlar', icon: MessageSquare},
  {value: 'Talepler', label: 'Teklif kutusu', icon: Inbox},
  {value: 'Randevular', label: 'Randevu takvimi', icon: CalendarDays},
  {section: 'Büyüme'},
  {value: 'Reklamlar', label: 'Reklam ve kampanyalar', icon: Megaphone},
  {value: 'Raporlar', label: 'Raporlar', icon: ChartColumn, passive: true},
  {value: 'Faturalar', label: 'Faturalar', icon: CreditCard, passive: true},
  {section: 'Yönetim'},
  {value: 'Ekip', label: 'Ekip ve roller', icon: Users},
  {value: 'Hizmet aktivasyonu', label: 'Özellikler', icon: ToggleRight},
  {value: 'Şubeler', label: 'Şubeler', icon: LayoutGrid, passive: true},
];
const kpis = ['Profil görüntüleme', 'Telefon düğmesi', 'Yol tarifi', 'Ortalama puan'];
const metrics = ['Görüntüleme', 'Telefon', 'Yol tarifi'];
const features = [
  {label: 'Teklif talepleri', Icon: FileText},
  {label: 'Randevu', Icon: CalendarDays},
];
const context = ref('');
const currentLabel = computed(() => {
  const item = nav.find(entry => 'value' in entry && entry.value === tab.value);
  return item && 'label' in item ? item.label : tab.value;
});

function select(value: string) {
  tab.value = value;
}
function setContext(label: string) {
  context.value = label;
}

useClientEffect(
  () => [app.user],
  () => {
    context.value = '';
  },
);

useClientEffect(
  () => [],
  () => {
    const id = new URLSearchParams(window.location.search).get('claim');
    if (id && /^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
      businessId.value = id;
      claim.value = true;
    }
  },
);

async function submit(e: Event) {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const v = claimSchema.parse({...Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)), ...(businessId.value ? {businessId: businessId.value} : {})});
    if (app.demo) {
      app.notify('Örnek başvuru kontrol edildi; gerçek sahiplik veya kurumsal hesap verilmedi.');
    } else {
      const r = await apiFetch('/api/claims', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user?.getIdToken()}`}, body: JSON.stringify(v)});
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      app.notify('Başvurun incelemeye alındı.');
      claimRevision.value++;
      claim.value = false;
    }
  } catch (caught) {
    error.value = caught instanceof Error && !caught.message.startsWith('[') ? caught.message : 'İşletme, adres, yetkili ve telefon alanlarını kontrol et.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NuxtPage v-if="route.matched.length > 1"/>
  <PanelShell v-else heading="İşletme Merkezi" :context="context" :title="i18nT(currentLabel)" :crumbs="i18nT('İşletme Merkezi')" :items="nav" :active="tab" :onSelect="select">
    <template #actions>
      <button v-if="tab === 'Ekip'" type="button" class="ds-btn p sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Plus :size="15"/>{{ i18nT("Kişi davet et") }}</button>
      <NuxtLink v-if="app.member" class="ds-iconbtn" to="/bildirimler" :aria-label="i18nT('Bildirimler')"><Bell :size="18"/></NuxtLink>
      <NuxtLink v-else-if="app.ready" class="ds-btn s sm" to="/isletme/giris">{{ i18nT("Giriş yap") }}</NuxtLink>
    </template>

    <p class="ds-small ds-muted">{{ tab === 'Genel bakış' ? i18nT("Başvurunu, açık özellikleri ve sıradaki adımları takip et.") : tab === 'Profilim' ? i18nT("Sürücülerin gördüğü işletme bilgilerini buradan düzenle.") : i18nT("İşletmenin ilgili işlemlerini yönet.") }}</p>

    <div class="ds-card ds-pad ds-row ds-sb ds-wrap ds-g16">
      <div class="ds-f1 claim-intro">
        <strong class="ds-row ds-g8"><ShieldCheck :size="20" class="ds-i"/>{{ i18nT("İşletme sahipliği ve şubeler") }}</strong>
        <p class="ds-small ds-muted">{{ i18nT("Yeni işletme bağlamak için başvur. Onaylanmış işletmelerini Profilim bölümünden yönet.") }}</p>
      </div>
      <button type="button" class="ds-btn p" @click="claim = !claim">{{ i18nT("Başvuruyu tamamla ") }}<ArrowRight :size="16"/></button>
    </div>

    <section v-if="claim" class="ds-card claim-card">
      <h2>{{ i18nT("İşletme başvurusu") }}</h2>
      <div v-if="businessId" class="ds-note info">{{ i18nT("Seçilen işletme kaydı: ") }}{{ businessId }}{{ i18nT(". Bilgiler bu kayda bağlı sahiplik başvurusu olarak incelenir.") }}</div>
      <p v-if="!app.member"><NuxtLink class="text-link" to="/isletme/giris">{{ i18nT("Başvurmak için ücretsiz hesabına giriş yap.") }}</NuxtLink></p>
      <form v-else class="form-grid" @submit="submit">
        <label>{{ i18nT("İşletme adı") }}<input class="ds-field" name="name" required minlength="2" maxlength="160"/></label>
        <label>{{ i18nT("İl") }}<select class="ds-field" name="city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select></label>
        <label class="span-all">{{ i18nT("Açık adres") }}<textarea class="ds-field" name="address" required minlength="10" maxlength="500"/></label>
        <label>{{ i18nT("Yetkili adı") }}<input class="ds-field" name="contactName" required minlength="2"/></label>
        <label>{{ i18nT("İşletme telefonu") }}<input class="ds-field" name="phone" type="tel" :placeholder="i18nT('05xx xxx xx xx')" required/></label>
        <label class="span-all">{{ i18nT("Başvuru notu") }}<textarea class="ds-field" name="note" maxlength="2000"/></label>
        <div class="ds-note span-all"><LockKeyhole :size="16" class="ds-i"/><span>{{ i18nT("Bu adımda kimlik veya ticari belge yüklemeyin. Güvenli belge doğrulama süreci canlıya geçişte ayrıca açılacak.") }}</span></div>
        <div v-if="error" class="ds-note err span-all" role="alert">{{ i18nT(error) }}</div>
        <button class="ds-btn p claim-submit" :disabled="busy">{{ app.demo ? i18nT("Örnek başvuruyu kontrol et") : i18nT("Başvuruyu gönder") }}</button>
      </form>
    </section>

    <BusinessPhotoPanel v-if="tab === 'Fotoğraflar'" :key="app.user?.uid ?? 'guest'"/>
    <FeatureActivation v-else-if="tab === 'Hizmet aktivasyonu'" :key="app.user?.uid ?? 'guest'"/>
    <RequestBoard v-else-if="['Talepler', 'Randevular'].includes(tab)" business :view="tab === 'Randevular' ? 'calendar' : 'inbox'" :key="app.user?.uid ?? 'guest'"/>
    <BusinessReplies v-else-if="tab === 'Yorumlar'" :key="app.user?.uid ?? 'guest'"/>
    <template v-else-if="tab === 'Profilim'">
      <template v-if="app.demo"><BusinessProfileEditor/><BusinessLocation/></template>
      <ManagedBusinessProfile v-else :key="app.user?.uid ?? 'guest'" :onContext="setContext"/>
    </template>
    <template v-else-if="tab === 'Konum ve saatler'">
      <BusinessLocation v-if="app.demo"/>
      <ManagedBusinessProfile v-else :key="app.user?.uid ?? 'guest'" section="location" :onContext="setContext"/>
    </template>
    <template v-else-if="tab === 'Genel bakış'">
      <div class="kpis">
        <div v-for="kpi in kpis" :key="kpi" class="ds-kpi ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
          <div class="ds-small ds-muted">{{ i18nT(kpi) }}</div>
          <div class="ds-xs ds-muted kpi-hint">{{ i18nT("Yakında") }}</div>
        </div>
      </div>
      <ClaimTracker :key="`${app.user?.uid ?? 'guest'}-${claimRevision}`"/>
      <div class="overview">
        <section class="ds-card ds-pad24 ds-col ds-g12">
          <h3>{{ i18nT("Yapılacaklar") }}</h3>
          <ol class="todo">
            <li><span class="ds-check" aria-hidden="true"/><span class="ds-f1">{{ i18nT("İşletmeni bul veya yeni işletme başvurusu oluştur.") }}</span><button type="button" class="todo-action" @click="claim = true">{{ i18nT("Başvuruya git") }}</button></li>
            <li><span class="ds-check" aria-hidden="true"/><span class="ds-f1">{{ i18nT("Sahiplik incelemesini tamamla.") }}</span></li>
            <li><span class="ds-check" aria-hidden="true"/><span class="ds-f1">{{ i18nT("Profil bilgilerini düzenle ve hizmetlerini etkinleştir.") }}</span><button type="button" class="todo-action" @click="tab = 'Profilim'">{{ i18nT("Profilim") }}</button></li>
          </ol>
          <div class="ds-note">
            <ShieldCheck :size="16" class="ds-i"/>
            <div>
              <strong>{{ i18nT("İşletmelerini Profilim bölümünden yönet.") }}</strong>
              <p>{{ i18nT("Bağlı şubelerin ve profil incelemelerin Profilim bölümünde görünür. Yorum, talep ve randevu özeti ayrıca açılacak.") }}</p>
            </div>
          </div>
          <div><button type="button" class="ds-btn s sm" @click="claim = true">{{ i18nT("Mevcut veya yeni işletme için başvur") }}</button></div>
        </section>
        <section class="ds-card ds-pad24 ds-col ds-g12">
          <h3>{{ i18nT("Aktivasyon durumu") }}</h3>
          <div v-for="{label, Icon} in features" :key="label" class="feature">
            <component :is="Icon" :size="18" class="ds-i"/>
            <div class="ds-f1">
              <div class="ds-small">{{ i18nT(label) }}</div>
              <p class="ds-xs ds-muted">{{ i18nT("Doğrulama ve aktivasyon sonrası açılır.") }}</p>
            </div>
          </div>
          <p class="ds-xs ds-muted">{{ i18nT("Kapalı özellikler sürücülerin profil ekranında gösterilmez.") }}</p>
          <p class="ds-xs ds-muted">{{ i18nT("Doğrulama rozeti yönetim yetkisini gösterir; hizmet kalitesi garantisi değildir.") }}</p>
          <div><button type="button" class="ds-btn s sm" @click="tab = 'Hizmet aktivasyonu'">{{ i18nT("Hizmet aktivasyonu") }}</button></div>
        </section>
      </div>
      <section class="ds-card ds-pad24 ds-col ds-g16">
        <div class="ds-row ds-sb ds-wrap ds-g12">
          <h3>{{ i18nT("Son 30 gün etkileşim") }}</h3>
          <div class="ds-seg">
            <button v-for="metric in metrics" :key="metric" type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT(metric) }}</button>
          </div>
        </div>
        <div class="ds-note">{{ i18nT("Etkileşim verisi henüz yok.") }}</div>
      </section>
      <section class="ds-card ds-pad24 ds-row ds-wrap ds-g16">
        <Megaphone :size="26" class="ds-i"/>
        <div class="ds-f1 ad-text">
          <h3>{{ i18nT("Doğru yerde, doğru sürücünün karşısında.") }}</h3>
          <p class="ds-small ds-muted">{{ i18nT("Arama, kategori ve ana sayfa görünürlüğünü keşfet.") }}</p>
        </div>
        <button type="button" class="ds-btn s sm" @click="tab = 'Reklamlar'">{{ i18nT("Reklam alanlarını gör ") }}<ArrowRight :size="16"/></button>
      </section>
    </template>
    <Campaigns v-else-if="tab === 'Reklamlar'" :key="app.user?.uid ?? 'guest'"/>
    <template v-else>
      <div class="ds-card ds-table-wrap">
        <table class="ds-table">
          <thead>
            <tr><th>{{ i18nT("Kişi") }}</th><th>{{ i18nT("Rol") }}</th><th>{{ i18nT("Yetkiler") }}</th><th>{{ i18nT("Durum") }}</th><th><span class="sr-only">{{ i18nT("Düzenle") }}</span></th></tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="5" class="team-empty">
                <p class="ds-muted">{{ i18nT("Bu alan, yetkili olduğun işletme hesabı bağlandığında açılacak.") }}</p>
                <button type="button" class="ds-btn s sm" @click="claim = true">{{ i18nT("Başvuruya git") }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ds-note"><Info :size="16" class="ds-i"/><span>{{ i18nT("Finans ve yetki yönetimi çalışanlarda varsayılan kapalıdır. Marka reklamvereni olmak servis profilini yönetme yetkisi vermez.") }}</span></div>
    </template>
  </PanelShell>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.claim-intro {min-width: 240px;}
.claim-intro p {margin-top: 4px;}
.claim-card {display: flex; flex-direction: column; gap: 20px; max-width: 900px; padding: 32px;}
.claim-card h2 {font-size: 28px; line-height: 1.12; margin: 0;}
.claim-card .form-grid label {font-weight: 700;}
.claim-submit {justify-self: start;}
.kpis {display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px;}
.kpi-hint {margin-top: 6px;}
.overview {display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 20px; align-items: start;}
.todo {list-style: none; margin: 0; padding: 0;}
.todo li {display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #edf0f3; font-size: 13px;}
.todo-action {flex: none; padding: 0; border: 0; background: none; color: #c4460b; font-size: 13px; font-weight: 700; cursor: pointer;}
.feature {display: flex; align-items: center; gap: 12px; padding: 8px 0;}
.ad-text {min-width: 220px;}
.ad-text h3 {margin-bottom: 4px;}
.team-empty {padding: 40px 14px; text-align: center;}
.team-empty p {margin-bottom: 14px;}
@media (max-width: 1100px) {
  .overview {grid-template-columns: minmax(0, 1fr);}
}
@media (max-width: 760px) {
  .kpis {grid-template-columns: repeat(2, minmax(0, 1fr));}
  .claim-card {padding: 20px;}
}
</style>
