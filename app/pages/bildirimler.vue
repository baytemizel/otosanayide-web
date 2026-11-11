<script setup lang="ts">
import {Store} from '@lucide/vue';
import NotificationInbox from '~/components/NotificationInbox.vue';
import PortalLink from '~/components/PortalLink.vue';
import SystemAccountLayout from '~/components/SystemAccountLayout.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const app = useApp();
const {t: i18nT} = useLocale();
useSeoMeta({title: () => i18nT('Bildirimler')});
</script>

<template>
  <SystemAccountLayout>
    <NotificationInbox/>
    <section v-if="app.member" class="ds-card ds-pad24 ds-row ds-g12 ds-wrap business">
      <Store class="ds-i" :size="20" aria-hidden="true"/>
      <div class="ds-f1 ds-col ds-g4">
        <h2>{{ i18nT('İşletme bildirimleri') }}</h2>
        <p class="ds-small ds-muted">{{ i18nT('Yönettiğin şubelerin talep, yorum ve başvuru bildirimleri İşletme Merkezi’nde.') }}</p>
      </div>
      <PortalLink class="ds-btn s sm" target="login">{{ i18nT('İşletme Merkezi') }}</PortalLink>
    </section>
  </SystemAccountLayout>
</template>

<style scoped>
.business {align-items: center;}
.business h2 {margin: 0; font: 700 16px/22px Arimo, Arial, sans-serif;}
.business p {margin: 0;}
</style>
