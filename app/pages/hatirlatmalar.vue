<script setup lang="ts">
// Reminders live on /araclarim (W11) in Web v2; keep the old address working.
const route = useRoute();
await navigateTo({path: '/araclarim', query: route.query}, {replace: true});
</script>

<template>
  <div/>
</template>
