<script setup lang="ts">
import AuthForm from '~/components/v2/garage/AuthForm.vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';
import {useLocale} from '~/composables/useLocale';

// W10 · Giriş / kayıt (Figma 123:5), sign-in mode. Live: /api/auth/login (+ MFA step); demo: preview sign-in.
const {t} = useLocale();
useSeoMeta({title: () => t('Giriş yap')});
</script>

<template>
  <AuthShell>
    <AuthForm mode="signin"/>
  </AuthShell>
</template>
