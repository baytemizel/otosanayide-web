<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight, CalendarDays, FileText, Megaphone, ShieldCheck} from '@lucide/vue';
import {cities, claimSchema} from '@otosanayide/core';
import BusinessLocation from '~/components/BusinessLocation.vue';
import BusinessPhotoPanel from '~/components/BusinessPhotoPanel.vue';
import BusinessProfileEditor from '~/components/BusinessProfileEditor.vue';
import BusinessReplies from '~/components/BusinessReplies.vue';
import Campaigns from '~/components/Campaigns.vue';
import ClaimTracker from '~/components/ClaimTracker.vue';
import FeatureActivation from '~/components/FeatureActivation.vue';
import ManagedBusinessProfile from '~/components/ManagedBusinessProfile.vue';
import RequestBoard from '~/components/RequestBoard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const {t: i18nT} = useLocale();
const app = useApp();
const businessId = ref('');
const claimRevision = ref(0);
const tab = ref('Genel bakış');
const claim = ref(false);
const error = ref('');
const busy = ref(false);
const tabs = ['Genel bakış', 'Profilim', 'Fotoğraflar', 'Hizmet aktivasyonu', 'Yorumlar', 'Talepler', 'Randevular', 'Reklamlar', 'Ekip'];
const features = [
  {label: 'Teklif talepleri', Icon: FileText},
  {label: 'Randevu', Icon: CalendarDays},
];

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
  <div class="dashboard" id="content">
    <aside class="sidebar">
      <h3>{{ i18nT("İşletme merkezi") }}</h3>
      <button v-for="t in tabs" :key="t" :class="tab === t ? 'selected' : ''" @click="tab = t">{{ i18nT(t) }}</button>
    </aside>
    <div class="dashboard-content">
      <h1>{{ tab === 'Genel bakış' ? i18nT("İşletmenin genel durumu") : tab === 'Profilim' ? i18nT("İşletme profilin") : i18nT(tab) }}</h1>
      <p class="lead">{{ tab === 'Genel bakış' ? i18nT("Başvurunu, açık özellikleri ve sıradaki adımları takip et.") : tab === 'Profilim' ? i18nT("Sürücülerin gördüğü işletme bilgilerini buradan düzenle.") : i18nT("İşletmenin ilgili işlemlerini yönet.") }}</p>
      <div class="notice row between">
        <div>
          <strong class="row"><ShieldCheck :size="20"/>{{ i18nT("İşletme sahipliği ve şubeler") }}</strong>
          <p>{{ i18nT("Yeni işletme bağlamak için başvur. Onaylanmış işletmelerini Profilim bölümünden yönet.") }}</p>
        </div>
        <button class="button primary" @click="claim = !claim">{{ i18nT("Başvuruyu tamamla ") }}<ArrowRight :size="18"/></button>
      </div>
      <section v-if="claim" class="panel">
        <h2>{{ i18nT("İşletme başvurusu") }}</h2>
        <p v-if="businessId" class="notice">{{ i18nT("Seçilen işletme kaydı: ") }}{{ businessId }}{{ i18nT(". Bilgiler bu kayda bağlı sahiplik başvurusu olarak incelenir.") }}</p>
        <p v-if="!app.member"><NuxtLink class="text-link" to="/giris">{{ i18nT("Başvurmak için ücretsiz hesabına giriş yap.") }}</NuxtLink></p>
        <form v-else class="form-grid" @submit="submit">
          <label>{{ i18nT("İşletme adı") }}<input name="name" required minlength="2" maxlength="160"/></label>
          <label>{{ i18nT("İl") }}<select name="city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select></label>
          <label class="span-all">{{ i18nT("Açık adres") }}<textarea name="address" required minlength="10" maxlength="500"/></label>
          <label>{{ i18nT("Yetkili adı") }}<input name="contactName" required minlength="2"/></label>
          <label>{{ i18nT("İşletme telefonu") }}<input name="phone" type="tel" :placeholder="i18nT('05xx xxx xx xx')" required/></label>
          <label class="span-all">{{ i18nT("Başvuru notu") }}<textarea name="note" maxlength="2000"/></label>
          <p class="small muted span-all">{{ i18nT("Bu adımda kimlik veya ticari belge yüklemeyin. Güvenli belge doğrulama süreci canlıya geçişte ayrıca açılacak.") }}</p>
          <p v-if="error" class="error span-all" role="alert">{{ i18nT(error) }}</p>
          <button class="button primary" :disabled="busy">{{ app.demo ? i18nT("Örnek başvuruyu kontrol et") : i18nT("Başvuruyu gönder") }}</button>
        </form>
      </section>
      <BusinessPhotoPanel v-if="tab === 'Fotoğraflar'" :key="app.user?.uid ?? 'guest'"/>
      <FeatureActivation v-else-if="tab === 'Hizmet aktivasyonu'" :key="app.user?.uid ?? 'guest'"/>
      <RequestBoard v-else-if="['Talepler', 'Randevular'].includes(tab)" business :key="app.user?.uid ?? 'guest'"/>
      <BusinessReplies v-else-if="tab === 'Yorumlar'" :key="app.user?.uid ?? 'guest'"/>
      <template v-else-if="tab === 'Profilim'">
        <template v-if="app.demo"><BusinessProfileEditor/><BusinessLocation/></template>
        <ManagedBusinessProfile v-else :key="app.user?.uid ?? 'guest'"/>
      </template>
      <template v-else-if="tab === 'Genel bakış'">
        <ClaimTracker :key="`${app.user?.uid ?? 'guest'}-${claimRevision}`"/>
        <div class="two-columns">
          <section class="panel">
            <h2>{{ i18nT("Sıradaki adımlar") }}</h2>
            <ol class="stack">
              <li>{{ i18nT("İşletmeni bul veya yeni işletme başvurusu oluştur.") }}</li>
              <li>{{ i18nT("Sahiplik incelemesini tamamla.") }}</li>
              <li>{{ i18nT("Profil bilgilerini düzenle ve hizmetlerini etkinleştir.") }}</li>
            </ol>
            <div class="profile-placeholder">
              <ShieldCheck :size="42"/>
              <h3>{{ i18nT("İşletmelerini Profilim bölümünden yönet.") }}</h3>
              <p>{{ i18nT("Bağlı şubelerin ve profil incelemelerin Profilim bölümünde görünür. Yorum, talep ve randevu özeti ayrıca açılacak.") }}</p>
            </div>
            <button class="button secondary" @click="claim = true">{{ i18nT("Mevcut veya yeni işletme için başvur") }}</button>
          </section>
          <section class="panel">
            <h2>{{ i18nT("Özelliklerin durumu") }}</h2>
            <div v-for="{label, Icon} in features" :key="label" class="feature-row">
              <component :is="Icon"/>
              <div>
                <h3>{{ i18nT(label) }}</h3>
                <p>{{ i18nT("Doğrulama ve aktivasyon sonrası açılır.") }}</p>
              </div>
            </div>
            <p class="small muted">{{ i18nT("Kapalı özellikler sürücülerin profil ekranında gösterilmez.") }}</p>
            <button class="button secondary" @click="tab = 'Hizmet aktivasyonu'">{{ i18nT("Hizmet aktivasyonu") }}</button>
          </section>
        </div>
      </template>
      <Campaigns v-else-if="tab === 'Reklamlar'" :key="app.user?.uid ?? 'guest'"/>
      <section v-else class="empty">
        <h2>{{ i18nT(tab) }}</h2>
        <p>{{ i18nT("Bu alan, yetkili olduğun işletme hesabı bağlandığında açılacak.") }}</p>
        <button class="button secondary" @click="claim = true">{{ i18nT("Başvuruya git") }}</button>
      </section>
      <section v-if="tab === 'Genel bakış'" class="business-ad">
        <Megaphone :size="30"/>
        <div>
          <h2>{{ i18nT("Doğru yerde, doğru sürücünün karşısında.") }}</h2>
          <p>{{ i18nT("Arama, kategori ve ana sayfa görünürlüğünü keşfet.") }}</p>
        </div>
        <button class="button secondary" @click="tab = 'Reklamlar'">{{ i18nT("Reklam alanlarını gör ") }}<ArrowRight :size="17"/></button>
      </section>
    </div>
  </div>
</template>
