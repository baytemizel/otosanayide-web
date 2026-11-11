<script setup lang="ts">
import {ref} from 'vue';
import {LogOut, UserRound} from '@lucide/vue';
import AccountSecurity from '~/components/AccountSecurity.vue';
import DataExportPanel from '~/components/DataExportPanel.vue';
import NotificationPreferences from '~/components/NotificationPreferences.vue';
import GarageRecyclePanel from '~/components/GarageRecyclePanel.vue';
import PrivacyRequestsPanel from '~/components/PrivacyRequestsPanel.vue';
import PushSettings from '~/components/PushSettings.vue';
import SystemAccountLayout from '~/components/SystemAccountLayout.vue';
import SystemCookiePreferences from '~/components/SystemCookiePreferences.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
const cookies = ref(false);
useSeoMeta({title: () => i18nT('Hesabım')});
</script>

<template>
  <SystemAccountLayout>
    <template v-if="app.member">
      <div id="gizlilik" class="ds-row ds-sb ds-wrap ds-g12">
        <div class="ds-col ds-g4">
          <h1 class="ds-serif">{{ i18nT("Gizlilik ve veri") }}</h1>
          <p class="ds-small ds-muted">{{ app.demo ? i18nT("Önizleme hesabı") : app.user?.email }}</p>
        </div>
        <button type="button" class="ds-btn s sm" @click="app.logout().then(() => app.notify('Oturum kapatıldı.'))"><LogOut :size="15"/>{{ i18nT("Çıkış yap") }}</button>
      </div>
      <AccountSecurity :key="app.user?.uid ?? 'guest'"/>
      <NotificationPreferences :key="'prefs-' + (app.user?.uid ?? 'guest')"/>
      <PushSettings :key="app.user?.uid ?? 'guest'"/>
      <DataExportPanel :key="'exports-' + (app.user?.uid ?? 'guest')"/>
      <GarageRecyclePanel/>
      <PrivacyRequestsPanel/>
      <section class="ds-card ds-pad24 ds-row ds-sb ds-wrap ds-g12">
        <div class="ds-f1 ds-col ds-g4 cookies-text">
          <h2>{{ i18nT("Çerez tercihleri") }}</h2>
          <p class="ds-small ds-muted">{{ i18nT("Zorunlu çerezler hizmet için gereklidir. Diğerleri yalnız onay verirsen kullanılır.") }}</p>
        </div>
        <button type="button" class="ds-btn s" @click="cookies = true">{{ i18nT("Tercihleri gör") }}</button>
      </section>
      <SystemCookiePreferences v-if="cookies" :onClose="() => (cookies = false)"/>
    </template>
    <template v-else>
      <h1 class="ds-serif">{{ i18nT("Hesabım") }}</h1>
      <div class="ds-card guest">
        <span class="guest-icon"><UserRound :size="36"/></span>
        <h2>{{ i18nT("Ücretsiz hesabınla daha fazlası.") }}</h2>
        <NuxtLink class="ds-btn p" to="/giris">{{ i18nT("Giriş yap") }}</NuxtLink>
      </div>
    </template>
  </SystemAccountLayout>
</template>

<style scoped>
h1 {margin: 0; font-size: 34px; line-height: 38px;}
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
p {margin: 0;}
#gizlilik {scroll-margin-top: 16px;}
.preference {padding: 8px 0;}
.ds-switch {border: 0; padding: 0;}
.cookies-text {flex-basis: 260px;}
.guest {display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 24px; text-align: center;}
.guest-icon {display: grid; place-items: center; width: 96px; height: 96px; border-radius: 48px; background: #f4f6f8;}
@media (max-width: 480px) {
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
