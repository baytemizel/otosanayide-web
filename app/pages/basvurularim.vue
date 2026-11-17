<script setup lang="ts">
import {computed} from 'vue';
import {ShieldCheck} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import AccountPageLayout from '~/components/v2/account/AccountPageLayout.vue';
import {useMockSession} from '~/composables/useMockSession';
import {claimStatusLabel, mockClaims} from '~/data/mock/account';
import {portalUrl} from '~/lib/portal';

// Başvurularım (ownership claims): linked from the Figma account menu; no Web v2 frame.
const session = useMockSession();
if (!session.signedIn.value) session.signIn();
useSeoMeta({title: 'Başvurularım'});
const claimHref = computed(() => portalUrl('claim') ?? '/#isletmeler');
</script>

<template>
  <AccountPageLayout active="basvurularim" title="Başvurularım">
    <template #actions><V2Button variant="dark" :href="claimHref" arrow>Yeni başvuru</V2Button></template>
    <p class="t-body-md t-muted">İşletme sahipliği başvuruların. Onaylanan işletmeyi işletme panelinden yönetirsin.</p>
    <ul v-if="mockClaims.length" class="list">
      <li v-for="claim in mockClaims" :key="claim.id" class="surface item">
        <span class="icon" aria-hidden="true"><ShieldCheck :size="22"/></span>
        <div class="copy">
          <div class="top">
            <NuxtLink :to="`/servis/${claim.businessId}`" class="t-h4">{{ claim.business }}</NuxtLink>
            <span class="tag" :class="claim.status === 'onaylandi' ? 'tag-lime' : 'tag-orange'">{{ claimStatusLabel[claim.status] }}</span>
          </div>
          <p class="t-mono-sm t-muted">{{ claim.id }} · {{ claim.date }}</p>
          <p class="t-body-sm">{{ claim.note }}</p>
        </div>
      </li>
    </ul>
  </AccountPageLayout>
</template>

<style scoped>
.list{display:flex;flex-direction:column;gap:16px}
.item{display:flex;gap:16px;padding:24px}
.icon{flex:none;width:52px;height:52px;border-radius:999px;display:grid;place-items:center;background:var(--lime-100);color:var(--ink-900)}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.top a:hover{text-decoration:underline}
</style>
