<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {ArrowRight, Check, Lock, Mail, Phone, User} from '@lucide/vue';
import AuthField from '~/components/v2/garage/AuthField.vue';
import {useMockSession} from '~/composables/useMockSession';

// W10 form panel (Figma 123:106). One form for both modes; the "Giriş yap / Kayıt ol" switch
// moves between /giris and /kayit and keeps ?donus. Mock only: any valid values sign in.
const props = defineProps<{mode: 'signin' | 'signup'}>();
const route = useRoute();
const session = useMockSession();

const method = ref<'email' | 'phone'>('email');
const form = reactive({name: '', email: '', phone: '', password: '', remember: true});
const errors = reactive({name: '', email: '', phone: '', password: ''});
const signup = computed(() => props.mode === 'signup');

const donus = computed(() => {
  const value = route.query.donus;
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null;
});
const keepQuery = computed(() => (donus.value ? {donus: donus.value} : {}));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate() {
  errors.name = signup.value && !form.name.trim() ? 'Adını ve soyadını yaz.' : '';
  errors.email = '';
  errors.phone = '';
  if (method.value === 'email') {
    if (!form.email.trim()) errors.email = 'E-posta adresini yaz.';
    else if (!EMAIL.test(form.email.trim())) errors.email = 'Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).';
  } else {
    const digits = form.phone.replace(/\D/g, '');
    if (!digits) errors.phone = 'Telefon numaranı yaz.';
    else if (digits.length < 10) errors.phone = 'Telefon numarası 10 haneli olmalı.';
  }
  errors.password = form.password ? '' : (signup.value ? 'Bir şifre belirle.' : 'Şifreni yaz.');
  return !errors.name && !errors.email && !errors.phone && !errors.password;
}

function finish() {
  session.signIn();
  return navigateTo(donus.value ?? '/araclarim');
}

function submit() {
  if (!validate()) return;
  void finish();
}

function switchMethod(next: 'email' | 'phone') {
  method.value = next;
  errors.email = '';
  errors.phone = '';
}
</script>

<template>
  <div class="auth-form">
    <nav class="mode" aria-label="Hesap">
      <NuxtLink :to="{path: '/giris', query: keepQuery}" class="mode-link" :class="{on: !signup}" :aria-current="!signup ? 'page' : undefined">Giriş yap</NuxtLink>
      <NuxtLink :to="{path: '/kayit', query: keepQuery}" class="mode-link" :class="{on: signup}" :aria-current="signup ? 'page' : undefined">Kayıt ol</NuxtLink>
    </nav>

    <h1 class="sr-only">{{ signup ? 'Kayıt ol' : 'Giriş yap' }}</h1>

    <div class="method" role="tablist" aria-label="Giriş yöntemi">
      <button type="button" role="tab" class="method-tab t-label-md" :class="{on: method === 'email'}" :aria-selected="method === 'email'" @click="switchMethod('email')">E-posta</button>
      <button type="button" role="tab" class="method-tab t-label-md" :class="{on: method === 'phone'}" :aria-selected="method === 'phone'" @click="switchMethod('phone')">Telefon</button>
    </div>

    <form class="fields" novalidate @submit.prevent="submit">
      <AuthField v-if="signup" id="auth-name" v-model="form.name" label="Ad soyad" :icon="User" placeholder="Deniz Kaya" autocomplete="name" :error="errors.name"/>
      <AuthField v-if="method === 'email'" id="auth-email" v-model="form.email" label="E-posta adresi" :icon="Mail" type="email" inputmode="email" placeholder="deniz@ornek.com" autocomplete="email" :error="errors.email"/>
      <AuthField v-else id="auth-phone" v-model="form.phone" label="Telefon numarası" :icon="Phone" type="tel" inputmode="tel" placeholder="5XX XXX XX XX" autocomplete="tel-national" :error="errors.phone"/>
      <AuthField
        id="auth-password"
        v-model="form.password"
        label="Şifre"
        :icon="Lock"
        type="password"
        placeholder="••••••••••"
        :autocomplete="signup ? 'new-password' : 'current-password'"
        :error="errors.password"
        :hint="signup ? 'En az 8 karakter; harf ve rakam karışık olsun.' : undefined"/>

      <div v-if="!signup" class="row">
        <label class="remember t-body-sm">
          <input v-model="form.remember" type="checkbox" class="box">
          <span class="box-face" aria-hidden="true"><Check :size="14" :stroke-width="2.5"/></span>
          Beni hatırla
        </label>
        <NuxtLink to="/giris/sifre-sifirla" class="forgot t-label-sm">Şifremi unuttum</NuxtLink>
      </div>
      <p v-else class="terms t-body-sm t-muted">
        Kayıt olarak <NuxtLink to="/yasal/kullanim-kosullari">Kullanım koşullarını</NuxtLink> ve
        <NuxtLink to="/yasal/gizlilik">Gizlilik bildirimini</NuxtLink> kabul edersin.
      </p>

      <button type="submit" class="btn btn-primary btn-lg submit">{{ signup ? 'Kayıt ol' : 'Giriş yap' }}<ArrowRight aria-hidden="true"/></button>
    </form>

    <div class="or" aria-hidden="true"><span/><p class="t-body-sm t-muted">veya</p><span/></div>
    <button type="button" class="social t-label-md" @click="finish">Google ile devam et</button>
    <button type="button" class="social t-label-md" @click="finish">Apple ile devam et</button>

    <p v-if="!signup" class="switch-line"><span class="t-body-sm t-muted">Hesabın yok mu?</span> <NuxtLink :to="{path: '/kayit', query: keepQuery}" class="t-label-sm">Ücretsiz kayıt ol</NuxtLink></p>
    <p v-else class="switch-line"><span class="t-body-sm t-muted">Zaten hesabın var mı?</span> <NuxtLink :to="{path: '/giris', query: keepQuery}" class="t-label-sm">Giriş yap</NuxtLink></p>
  </div>
</template>

<style scoped>
.auth-form{display:flex;flex-direction:column;gap:20px}
.mode{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--cream-100)}
.mode-link{flex:1 1 0;display:flex;align-items:center;justify-content:center;padding:12px;border-radius:999px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-700);transition:background-color .15s ease}
.mode-link.on{background:var(--ink-900);color:var(--white)}
.mode-link:not(.on):hover{background:rgba(255,255,255,.6)}
.method{display:flex;gap:20px}
.method-tab{display:flex;flex-direction:column;gap:8px;color:var(--ink-500)}
.method-tab::after{content:"";height:3px;border-radius:2px;background:transparent}
.method-tab.on{color:var(--ink-900)}
.method-tab.on::after{background:var(--orange-500)}
.fields{display:flex;flex-direction:column;gap:20px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.remember{position:relative;display:inline-flex;align-items:center;gap:10px;color:var(--ink-800);cursor:pointer}
.box{position:absolute;opacity:0;width:22px;height:22px;margin:0;cursor:pointer}
.box-face{flex:none;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--ink-300);background:var(--white);display:grid;place-items:center;color:transparent}
.box:checked + .box-face{background:var(--orange-500);border-color:var(--orange-500);color:var(--ink-900)}
.box:focus-visible + .box-face{outline:2px solid var(--orange-500);outline-offset:3px}
.forgot{color:var(--orange-600)}
.forgot:hover,.switch-line a:hover,.terms a:hover{text-decoration:underline}
.terms a{color:var(--orange-600);font-weight:600}
.submit{width:100%}
.or{display:flex;align-items:center;gap:14px}
.or span{flex:1;height:1px;background:var(--cream-200)}
.social{display:flex;align-items:center;justify-content:center;width:100%;padding:15px;border:1px solid var(--cream-200);border-radius:999px;color:var(--ink-900);background:var(--white);transition:border-color .15s ease}
.social:hover{border-color:var(--ink-900)}
.switch-line{display:flex;justify-content:center;align-items:baseline;gap:6px;flex-wrap:wrap}
.switch-line a{color:var(--orange-600)}
</style>
