<script setup lang="ts">
import {computed, ref} from 'vue';
import {FileText, MessageSquare} from '@lucide/vue';
import OwnReviewItem from '~/components/OwnReviewItem.vue';
import SystemAccountLayout from '~/components/SystemAccountLayout.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {fetchOwnReviews, type OwnReviewListItem} from '~/lib/own-reviews';

const app = useApp();
const {t: i18nT} = useLocale();
useSeoMeta({title: () => i18nT('Yorumlarım')});

const listed = ref<OwnReviewListItem[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const verified = computed(() => app.demo || app.user?.emailVerified === true);
const none = computed(() => !loading.value && !error.value && listed.value.length === 0);

useClientEffect(() => [app.user, app.demo, cursor.value], () => {
  if (!app.user || app.demo || !verified.value) return;
  let cancelled = false;
  const user = app.user;
  loading.value = true;
  error.value = '';
  fetchOwnReviews(() => user.getIdToken(), cursor.value)
    .then(page => {
      if (cancelled) return;
      listed.value = page.items;
      next.value = page.next;
    })
    .catch(e => {
      if (!cancelled) error.value = e instanceof Error ? e.message : 'Yorumlar yüklenemedi.';
    })
    .finally(() => {
      if (!cancelled) loading.value = false;
    });
  return () => {
    cancelled = true;
  };
});
</script>

<template>
  <SystemAccountLayout>
    <section class="ds-col ds-g16">
      <h1 class="ds-serif">{{ i18nT('Yorumlarım') }}</h1>
      <p class="ds-small ds-muted">{{ i18nT('Yorumlarının yayın durumunu takip et; uygunsa düzenle veya geri çek. Düzenlenen yorum yeniden incelenir.') }}</p>
      <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede gerçek yorum oluşturulmaz.') }}</p>
      <NuxtLink v-else-if="!app.user" class="ds-btn p own-login" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
      <p v-else-if="!verified" class="ds-note warn">{{ i18nT('Yorumlarını görmek için e-posta adresini doğrula.') }} <NuxtLink to="/hesabim#guvenlik">{{ i18nT('Hesabım › Güvenlik') }}</NuxtLink></p>
      <template v-else>
        <p v-if="loading" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
        <OwnReviewItem v-for="item in listed" :key="item.businessId" :businessId="item.businessId" :businessName="item.businessName" :available="item.businessAvailable !== false"/>
        <div v-if="cursor || next" class="ds-row ds-g10">
          <button v-if="cursor" type="button" class="ds-btn s sm" @click="cursor = ''">{{ i18nT('İlk sayfa') }}</button>
          <button v-if="next" type="button" class="ds-btn s sm" @click="cursor = next!">{{ i18nT('Sonraki sayfa') }}</button>
        </div>
        <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
      </template>
      <div v-if="app.user && !app.demo && verified && none" class="ds-card ds-pad24 ds-col ds-g8 empty">
        <MessageSquare :size="28" aria-hidden="true"/>
        <p class="ds-small">{{ i18nT('Burada gösterilecek yorumun yok.') }}</p>
        <NuxtLink class="ds-btn s sm" to="/">{{ i18nT('İşletmeleri keşfet') }}</NuxtLink>
      </div>
      <section class="ds-card ds-pad24 ds-row ds-g12 ds-wrap cases">
        <FileText class="ds-i" :size="20" aria-hidden="true"/>
        <div class="ds-f1 ds-col ds-g4">
          <h2>{{ i18nT('Şikâyet ve itirazlarım') }}</h2>
          <p class="ds-small ds-muted">{{ i18nT('Bildirdiğin yorumların ve itirazlarının durumu ile karar gerekçeleri.') }}</p>
        </div>
        <NuxtLink class="ds-btn s sm" to="/basvurularim">{{ i18nT('Başvurularım') }}</NuxtLink>
      </section>
    </section>
  </SystemAccountLayout>
</template>

<style scoped>
h1 {margin: 0; font-size: 34px; line-height: 38px;}
p {margin: 0;}
.own-login {align-self: flex-start;}
.empty {align-items: flex-start;}
.cases {align-items: center;}
.cases h2 {margin: 0; font: 700 16px/22px Arimo, Arial, sans-serif;}
@media (max-width: 480px) {h1 {font-size: 28px; line-height: 32px;}}
</style>
