<script setup lang="ts">
import {computed} from 'vue';
import {Lock, TriangleAlert} from '@lucide/vue';
import type {NuxtError} from '#app';
import V2Button from '~/components/v2/V2Button.vue';
import V2Footer from '~/components/v2/V2Footer.vue';
import V2Navbar from '~/components/v2/V2Navbar.vue';
import SystemStateView from '~/components/v2/system/SystemStateView.vue';
import {useAppHead} from '~/composables/useAppHead';
import {portalUrl} from '~/lib/portal';

// S01 · 404 and S05 · Yetkisiz erişim; other errors reuse the same layout.
const props = defineProps<{error: NuxtError}>();
useAppHead();
const status = computed(() => props.error.statusCode ?? 500);
useSeoMeta({title: () => (status.value === 404 ? 'Sayfa bulunamadı' : 'Bir sorun oluştu'), robots: 'noindex'});
const claimHref = computed(() => portalUrl('claim') ?? '/#isletmeler');
const home = () => clearError({redirect: '/'});
</script>

<template>
  <div class="v2-app">
    <V2Navbar/>
    <main id="icerik">
      <SystemStateView v-if="status === 404" code="404" eyebrow="Sayfa bulunamadı" title="Bu sayfa servisten çıkmış." text="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir. Aramaya ana sayfadan devam edebilirsin.">
        <V2Button size="lg" arrow @click="home">Ana sayfaya dön</V2Button>
        <V2Button variant="outline" @click="clearError({redirect: '/ara'})">Servis ara</V2Button>
      </SystemStateView>
      <SystemStateView v-else-if="status === 401 || status === 403" :icon="Lock" eyebrow="Yetki gerekli" title="Bu sayfa için yetkin yok." text="Bu alan yalnızca işletme yöneticilerine açık. İşletme seninse sahiplik başvurusu yapabilirsin.">
        <V2Button size="lg" arrow :href="claimHref">Sahiplik başvurusu</V2Button>
        <V2Button variant="outline" @click="home">Ana sayfaya dön</V2Button>
      </SystemStateView>
      <SystemStateView v-else :icon="TriangleAlert" eyebrow="Hata" title="Bir şeyler ters gitti." text="Sayfa şu an yüklenemedi. Birazdan tekrar dene; sorun sürerse ana sayfadan devam edebilirsin.">
        <V2Button size="lg" arrow @click="home">Ana sayfaya dön</V2Button>
      </SystemStateView>
    </main>
    <V2Footer/>
  </div>
</template>

<style scoped>
.v2-app{min-height:100vh;display:flex;flex-direction:column}
main{flex:1}
</style>
