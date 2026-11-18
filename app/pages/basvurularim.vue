<script setup lang="ts">
import {computed, reactive} from 'vue';
import {ShieldCheck} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import AccountPageLayout from '~/components/v2/account/AccountPageLayout.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {useClaims} from '~/composables/v2/useAccountData';
import {claimStatusLabel, mockClaims} from '~/data/mock/account';
import {demoMode} from '~/lib/env';
import {portalUrl} from '~/lib/portal';
import {claimRow} from '~/lib/v2/requests';

// Başvurularım (ownership claims): linked from the Figma account menu; no Web v2 frame.
// Demo: mock claims. Live: GET /api/claims with the core status labels; a claim waiting for more
// information can be answered here (PATCH /api/claims). Documents are sent from the business portal.
useMemberPage();
const demo = demoMode();
useSeoMeta({title: 'Başvurularım', robots: 'noindex, nofollow'});
const claimHref = computed(() => portalUrl('claim') ?? '/#isletmeler');

const live = useClaims();
const rows = computed(() => live.claims.value.map(claimRow));
const drafts = reactive<Record<string, string>>({});
const errors = reactive<Record<string, string>>({});
async function reply(id: string) {
  errors[id] = '';
  try {
    await live.reply(id, drafts[id] ?? '');
    drafts[id] = '';
  } catch (e) {
    errors[id] = e instanceof Error ? e.message : 'Yanıt gönderilemedi.';
  }
}
</script>

<template>
  <AccountPageLayout active="basvurularim" title="Başvurularım">
    <template #actions><V2Button variant="dark" :href="claimHref" arrow>Yeni başvuru</V2Button></template>
    <p class="t-body-md t-muted">İşletme sahipliği başvuruların. Onaylanan işletmeyi işletme panelinden yönetirsin.</p>
    <ul v-if="demo && mockClaims.length" class="list">
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

    <template v-if="!demo">
      <p v-if="live.loading.value && !rows.length" class="t-body-md t-muted" role="status">Başvurular yükleniyor…</p>
      <div v-else-if="live.error.value" class="surface empty" role="alert">
        <p class="t-label-md">Başvurular yüklenemedi.</p>
        <p class="t-body-sm">{{ live.error.value }}</p>
        <V2Button variant="outline" size="sm" @click="live.load()">Tekrar dene</V2Button>
      </div>
      <ul v-else-if="rows.length" class="list">
        <li v-for="claim in rows" :key="claim.id" class="surface item">
          <span class="icon" aria-hidden="true"><ShieldCheck :size="22"/></span>
          <div class="copy">
            <div class="top">
              <NuxtLink v-if="claim.businessId" :to="`/servis/${claim.businessId}`" class="t-h4">{{ claim.business }}</NuxtLink>
              <span v-else class="t-h4">{{ claim.business }}</span>
              <span class="tag" :class="`tag-${claim.tone}`">{{ claim.label }}</span>
            </div>
            <p class="t-mono-sm t-muted">{{ claim.id }}<template v-if="claim.place"> · {{ claim.place }}</template></p>
            <p v-if="claim.note" class="t-body-sm">{{ claim.note }}</p>
            <p v-if="claim.reply" class="t-body-sm t-muted">Yanıtın: {{ claim.reply }}</p>
            <form v-if="claim.canReply" class="reply" @submit.prevent="reply(claim.id)">
              <label class="field">
                <span class="field-label">Yanıtın (en az 10 karakter)</span>
                <textarea v-model="drafts[claim.id]" class="textarea" maxlength="2000" :disabled="live.busy.value === claim.id"/>
              </label>
              <p class="t-body-sm t-muted">Belgeleri işletme panelinden yükleyebilirsin.</p>
              <V2Button type="submit" variant="outline" size="sm" :disabled="live.busy.value === claim.id || (drafts[claim.id] ?? '').trim().length < 10">{{ live.busy.value === claim.id ? 'Gönderiliyor…' : 'Yanıtı gönder' }}</V2Button>
              <p v-if="errors[claim.id]" class="err t-body-sm" role="alert">{{ errors[claim.id] }}</p>
            </form>
          </div>
        </li>
      </ul>
      <div v-else-if="live.loaded.value" class="surface empty">
        <ShieldCheck :size="24" aria-hidden="true"/>
        <p class="t-label-md">Henüz başvurun yok.</p>
        <p class="t-body-sm">İşletmenin sahibiysen “Yeni başvuru” ile başlayabilirsin.</p>
      </div>
    </template>
  </AccountPageLayout>
</template>

<style scoped>
.list{display:flex;flex-direction:column;gap:16px}
.item{display:flex;gap:16px;padding:24px}
.icon{flex:none;width:52px;height:52px;border-radius:999px;display:grid;place-items:center;background:var(--lime-100);color:var(--ink-900)}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.top a:hover{text-decoration:underline}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;color:var(--ink-500);text-align:center}
.reply{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:8px}
.reply .field{width:100%}
.err{color:var(--red-500);font-weight:600}
</style>
