<script setup lang="ts">
import {useMockSession} from '~/composables/useMockSession';

// Reminders live on /araclarim (W11) in Web v2; keep the old address working.
const session = useMockSession();
if (!session.signedIn.value) session.signIn();
const route = useRoute();
await navigateTo({path: '/araclarim', query: route.query}, {replace: true});
</script>

<template>
  <div/>
</template>
