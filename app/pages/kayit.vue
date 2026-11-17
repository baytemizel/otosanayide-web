<script setup lang="ts">
import AuthForm from '~/components/v2/garage/AuthForm.vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';

// W10 · Giriş / kayıt (Figma 123:5), sign-up mode. Mock: any valid values create the session.
useSeoMeta({title: 'Kayıt ol'});
</script>

<template>
  <AuthShell>
    <AuthForm mode="signup"/>
  </AuthShell>
</template>
