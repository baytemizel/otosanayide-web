<script setup lang="ts">
import {CarFront, Heart, LogOut, UserRound} from '@lucide/vue';
import GarageRecyclePanel from '~/components/GarageRecyclePanel.vue';
import PrivacyRequestsPanel from '~/components/PrivacyRequestsPanel.vue';
import PushSettings from '~/components/PushSettings.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
</script>

<template>
  <div class="container page" id="content">
    <h1>{{ i18nT("Hesabım") }}</h1>
    <template v-if="app.member">
      <p class="lead">{{ app.demo ? i18nT("Önizleme hesabı") : app.user?.email }}</p>
      <div class="account-links">
        <NuxtLink class="panel" to="/bildirimler"><h2>{{ i18nT("Bildirimler") }}</h2></NuxtLink>
        <NuxtLink class="panel" to="/taleplerim"><h2>{{ i18nT("Teklif ve randevular") }}</h2></NuxtLink>
        <NuxtLink class="panel" to="/basvurularim"><h2>{{ i18nT("Başvurularım") }}</h2><p>{{ i18nT("Şikâyet ve itirazlarının durumunu ve karar gerekçelerini burada takip et.") }}</p></NuxtLink>
        <NuxtLink class="panel" to="/araclarim"><CarFront/><h2>{{ i18nT("Araçlarım") }}</h2><p>{{ i18nT("Araçların, bakım geçmişin ve hatırlatmaların.") }}</p></NuxtLink>
        <NuxtLink class="panel" to="/kaydedilenler"><Heart/><h2>{{ i18nT("Kaydedilenler") }}</h2><p>{{ i18nT("Bir sonraki bakımda kolayca bul.") }}</p></NuxtLink>
      </div>
      <PushSettings :key="app.user?.uid ?? 'guest'"/>
      <GarageRecyclePanel/>
      <PrivacyRequestsPanel/>
      <button class="button secondary" @click="app.logout().then(() => app.notify('Oturum kapatıldı.'))"><LogOut :size="18"/>{{ i18nT("Çıkış yap") }}</button>
    </template>
    <div v-else class="empty">
      <UserRound :size="36"/>
      <h2>{{ i18nT("Ücretsiz hesabınla daha fazlası.") }}</h2>
      <NuxtLink class="button primary" to="/giris">{{ i18nT("Giriş yap") }}</NuxtLink>
    </div>
  </div>
</template>
