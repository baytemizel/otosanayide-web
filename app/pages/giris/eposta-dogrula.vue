<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {ArrowRight, Check, LoaderCircle, X} from '@lucide/vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';

// E-mail verification link target, in the W10 card style (no Figma frame of its own).
// Mock: shows "doğrulanıyor" briefly, then "doğrulandı". ?durum=hata shows the expired-link state.
useSeoMeta({title: 'E-posta doğrulama'});
const route = useRoute();
const failed = computed(() => route.query.durum === 'hata');
const status = ref<'working' | 'done'>('working');
onMounted(() => { window.setTimeout(() => { status.value = 'done'; }, 1200); });
</script>

<template>
  <AuthShell>
    <div class="state" aria-live="polite">
      <template v-if="failed">
        <span class="badge bad" aria-hidden="true"><X :size="26"/></span>
        <p class="t-mono-md t-eyebrow">E-posta doğrulama</p>
        <h1 class="t-h3">Bağlantının süresi dolmuş</h1>
        <p class="t-body-md t-muted">Doğrulama bağlantısı geçersiz ya da daha önce kullanılmış. Giriş yaptıktan sonra Hesabım › Güvenlik bölümünden yeni bağlantı isteyebilirsin.</p>
        <NuxtLink to="/giris" class="btn btn-primary btn-lg wide">Girişe dön<ArrowRight aria-hidden="true"/></NuxtLink>
      </template>
      <template v-else-if="status === 'working'">
        <span class="badge" aria-hidden="true"><LoaderCircle :size="26" class="spin"/></span>
        <p class="t-mono-md t-eyebrow">E-posta doğrulama</p>
        <h1 class="t-h3">E-posta adresin doğrulanıyor…</h1>
        <p class="t-body-md t-muted">Bu birkaç saniye sürebilir. Sayfayı kapatma.</p>
      </template>
      <template v-else>
        <span class="badge ok" aria-hidden="true"><Check :size="26" :stroke-width="2.5"/></span>
        <p class="t-mono-md t-eyebrow">E-posta doğrulama</p>
        <h1 class="t-h3">E-posta adresin doğrulandı</h1>
        <p class="t-body-md t-muted">Artık hatırlatmaları e-postayla da alabilirsin. Kaldığın yerden devam et.</p>
        <NuxtLink to="/araclarim" class="btn btn-primary btn-lg wide">Garajıma git<ArrowRight aria-hidden="true"/></NuxtLink>
        <NuxtLink to="/" class="btn btn-outline wide">Ana sayfaya dön</NuxtLink>
      </template>
    </div>
  </AuthShell>
</template>

<style scoped>
.state{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px}
.badge{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--cream-100);color:var(--ink-900);margin-bottom:8px}
.badge.ok{background:var(--lime-400)}
.badge.bad{background:var(--orange-100);color:var(--orange-600)}
.wide{width:100%}
.btn-lg.wide{margin-top:12px}
.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
