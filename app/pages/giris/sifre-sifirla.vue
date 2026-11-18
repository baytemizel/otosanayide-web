<script setup lang="ts">
import {reactive, ref} from 'vue';
import {ArrowRight, Check, Lock, X} from '@lucide/vue';
import AuthField from '~/components/v2/garage/AuthField.vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';
import {useLinkToken} from '~/composables/v2/useLinkToken';
import {demoMode} from '~/lib/env';
import {authErrorMessage, PASSWORD_MIN} from '~/lib/v2/auth';
import {browserSession} from '~/lib/session-instance';

// Password reset link target, in the W10 card style (no Figma frame of its own).
// Live: the one-use ?token= is taken out of the address bar; POST /api/auth/password/reset sets the
// new password (at least 10 characters). Demo: a valid new password shows the success state; nothing is sent.
useSeoMeta({title: 'Şifreni yenile'});
const live = !demoMode();
const min = live ? PASSWORD_MIN : 8;
const form = reactive({password: '', repeat: ''});
const errors = reactive({password: '', repeat: ''});
const done = ref(false);
const busy = ref(false);
const formError = ref('');
const link = live ? useLinkToken() : null;

async function submit() {
  if (busy.value) return;
  errors.password = !form.password ? 'Yeni şifreni yaz.' : form.password.length < min ? `Şifre en az ${min} karakter olmalı.` : '';
  errors.repeat = !form.repeat ? 'Şifreni tekrar yaz.' : form.repeat !== form.password ? 'Şifreler aynı değil.' : '';
  if (errors.password || errors.repeat) return;
  if (!link) {
    done.value = true;
    return;
  }
  busy.value = true;
  formError.value = '';
  try {
    await browserSession().resetPassword(link.token.value, form.password);
    link.token.value = '';
    form.password = '';
    form.repeat = '';
    done.value = true;
  } catch (error) {
    formError.value = authErrorMessage('reset', error);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthShell>
    <div v-if="link?.missing.value" class="state" role="alert">
      <span class="badge bad" aria-hidden="true"><X :size="26"/></span>
      <p class="t-mono-md t-eyebrow">Şifre yenileme</p>
      <h1 class="t-h3">Bağlantı geçersiz</h1>
      <p class="t-body-md t-muted">Şifre yenileme bağlantısı eksik, geçersiz ya da süresi dolmuş. Giriş sayfasındaki “Şifremi unuttum” ile yeni bağlantı iste.</p>
      <NuxtLink to="/giris" class="btn btn-primary btn-lg wide">Girişe dön<ArrowRight aria-hidden="true"/></NuxtLink>
    </div>
    <div v-else-if="done" class="state" role="status">
      <span class="badge" aria-hidden="true"><Check :size="26" :stroke-width="2.5"/></span>
      <p class="t-mono-md t-eyebrow">Şifre yenileme</p>
      <h1 class="t-h3">Şifren güncellendi</h1>
      <p class="t-body-md t-muted">{{ live ? 'Yeni şifrenle giriş yapabilirsin.' : 'Güvenlik için diğer cihazlardaki oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin.' }}</p>
      <NuxtLink to="/giris" class="btn btn-primary btn-lg wide">Giriş yap<ArrowRight aria-hidden="true"/></NuxtLink>
    </div>
    <form v-else class="state" novalidate @submit.prevent="submit">
      <p class="t-mono-md t-eyebrow">Şifre yenileme</p>
      <h1 class="t-h3">Şifreni yenile</h1>
      <p class="t-body-md t-muted">Hesabın için yeni bir şifre belirle.</p>
      <div class="fields">
        <AuthField id="reset-password" v-model="form.password" label="Yeni şifre" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.password" :hint="live ? `En az ${min} karakter.` : 'En az 8 karakter; harf ve rakam karışık olsun.'"/>
        <AuthField id="reset-repeat" v-model="form.repeat" label="Yeni şifre (tekrar)" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.repeat"/>
      </div>
      <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary btn-lg wide" :disabled="busy || (live && !link?.token.value)">{{ busy ? 'Güncelleniyor…' : 'Şifreyi güncelle' }}<ArrowRight aria-hidden="true"/></button>
      <NuxtLink to="/giris" class="back t-label-sm">Girişe dön</NuxtLink>
    </form>
  </AuthShell>
</template>

<style scoped>
.state{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px}
.fields{align-self:stretch;display:flex;flex-direction:column;gap:20px;margin-top:8px}
.badge{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--lime-400);color:var(--ink-900);margin-bottom:8px}
.badge.bad{background:var(--orange-100);color:var(--orange-600)}
.wide{width:100%;margin-top:8px}
.form-err{align-self:stretch;padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
.back{align-self:center;color:var(--orange-600)}
.back:hover{text-decoration:underline}
</style>
