<script setup lang="ts">
import {reactive, ref} from 'vue';
import {ArrowRight, Check, Lock} from '@lucide/vue';
import AuthField from '~/components/v2/garage/AuthField.vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';

// Password reset link target, in the W10 card style (no Figma frame of its own).
// Mock: a valid new password shows the success state; nothing is sent anywhere.
useSeoMeta({title: 'Şifreni yenile'});
const form = reactive({password: '', repeat: ''});
const errors = reactive({password: '', repeat: ''});
const done = ref(false);

function submit() {
  errors.password = !form.password ? 'Yeni şifreni yaz.' : form.password.length < 8 ? 'Şifre en az 8 karakter olmalı.' : '';
  errors.repeat = !form.repeat ? 'Şifreni tekrar yaz.' : form.repeat !== form.password ? 'Şifreler aynı değil.' : '';
  if (!errors.password && !errors.repeat) done.value = true;
}
</script>

<template>
  <AuthShell>
    <div v-if="done" class="state" role="status">
      <span class="badge" aria-hidden="true"><Check :size="26" :stroke-width="2.5"/></span>
      <p class="t-mono-md t-eyebrow">Şifre yenileme</p>
      <h1 class="t-h3">Şifren güncellendi</h1>
      <p class="t-body-md t-muted">Güvenlik için diğer cihazlardaki oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin.</p>
      <NuxtLink to="/giris" class="btn btn-primary btn-lg wide">Giriş yap<ArrowRight aria-hidden="true"/></NuxtLink>
    </div>
    <form v-else class="state" novalidate @submit.prevent="submit">
      <p class="t-mono-md t-eyebrow">Şifre yenileme</p>
      <h1 class="t-h3">Şifreni yenile</h1>
      <p class="t-body-md t-muted">Hesabın için yeni bir şifre belirle.</p>
      <div class="fields">
        <AuthField id="reset-password" v-model="form.password" label="Yeni şifre" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.password" hint="En az 8 karakter; harf ve rakam karışık olsun."/>
        <AuthField id="reset-repeat" v-model="form.repeat" label="Yeni şifre (tekrar)" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.repeat"/>
      </div>
      <button type="submit" class="btn btn-primary btn-lg wide">Şifreyi güncelle<ArrowRight aria-hidden="true"/></button>
      <NuxtLink to="/giris" class="back t-label-sm">Girişe dön</NuxtLink>
    </form>
  </AuthShell>
</template>

<style scoped>
.state{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px}
.fields{align-self:stretch;display:flex;flex-direction:column;gap:20px;margin-top:8px}
.badge{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--lime-400);color:var(--ink-900);margin-bottom:8px}
.wide{width:100%;margin-top:8px}
.back{align-self:center;color:var(--orange-600)}
.back:hover{text-decoration:underline}
</style>
