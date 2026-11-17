<script setup lang="ts">
import {computed, ref} from 'vue';
import {BellOff, SlidersVertical} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import AccountPrefsList from '~/components/v2/requests/AccountPrefsList.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import NotificationRow from '~/components/v2/requests/NotificationRow.vue';
import {useMockSession} from '~/composables/useMockSession';
import {mockNotifications, notificationFilters, type MockNotification} from '~/data/mock/requests';

// W17 · Bildirimler (Figma 127:813). Filter chips, mark one / all as read, "Tercihler" modal.
const session = useMockSession();
if (!session.signedIn.value) session.signIn();

useSeoMeta({title: 'Bildirimler'});

const items = useState<MockNotification[]>('v2-req-notifications', () => mockNotifications.map((item) => ({...item})));
const filter = ref<(typeof notificationFilters)[number]['id']>('tumu');
const prefsOpen = ref(false);

const visible = computed(() => items.value.filter((item) => filter.value === 'tumu' || item.kind === filter.value));
const unreadCount = computed(() => items.value.filter((item) => item.unread).length);
const chipLabel = (id: string, label: string) => (id === 'tumu' ? `${label} · ${items.value.length}` : label);

function markRead(id: string) {
  const item = items.value.find((entry) => entry.id === id);
  if (item) item.unread = false;
}
function markAll() {
  items.value.forEach((item) => { item.unread = false; });
}
</script>

<template>
  <div class="account v2-wrap">
    <V2AccountMenu active="bildirimler"/>

    <div class="col">
      <header class="head">
        <div class="titles">
          <p class="t-mono-md t-eyebrow">HESABIM</p>
          <h1 class="t-h2">Bildirimler</h1>
        </div>
        <div class="head-actions">
          <V2Button variant="outline" :disabled="!unreadCount" @click="markAll">Tümünü okundu yap</V2Button>
          <button type="button" class="prefs-btn" aria-haspopup="dialog" @click="prefsOpen = true"><SlidersVertical :size="16" aria-hidden="true"/>Tercihler</button>
        </div>
      </header>

      <div class="chips" role="group" aria-label="Bildirim türü">
        <V2Chip
          v-for="item in notificationFilters"
          :key="item.id"
          as="button"
          :variant="filter === item.id ? 'active' : 'default'"
          :pressed="filter === item.id"
          @click="filter = item.id"
        >{{ chipLabel(item.id, item.label) }}</V2Chip>
      </div>

      <p class="sr-only" aria-live="polite">{{ unreadCount ? `${unreadCount} okunmamış bildirim` : 'Okunmamış bildirim yok' }}</p>

      <ul v-if="visible.length" class="list surface">
        <NotificationRow v-for="item in visible" :key="item.id" :item="item" @read="markRead(item.id)"/>
      </ul>
      <div v-else class="empty surface">
        <BellOff :size="24" aria-hidden="true"/>
        <p class="t-label-md">Bu türde bildirim yok.</p>
        <p class="t-body-sm t-muted">Yeni bir gelişme olduğunda burada görünür.</p>
      </div>
    </div>

    <V2Modal :open="prefsOpen" title="Bildirim tercihleri" subtitle="Hangi bildirimleri almak istediğini seç." :width="560" @close="prefsOpen = false">
      <AccountPrefsList/>
      <template #footer>
        <V2Button variant="outline" to="/hesabim#gizlilik">Tüm gizlilik ayarları</V2Button>
        <V2Button variant="dark" @click="prefsOpen = false">Tamam</V2Button>
      </template>
    </V2Modal>
  </div>
</template>

<style scoped>
.account{display:flex;align-items:flex-start;gap:32px;padding-top:40px;padding-bottom:104px}
.col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.titles{display:flex;flex-direction:column;gap:10px}
.head-actions{display:flex;gap:10px;flex-wrap:wrap}
.prefs-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 20px;border-radius:999px;background:var(--ink-900);color:var(--white);font-weight:600;font-size:15px;line-height:1.2;transition:transform .15s ease}
.prefs-btn:hover{transform:translateY(-1px)}
.prefs-btn svg{color:var(--lime-400)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.list{display:flex;flex-direction:column;gap:2px;padding:8px}
.empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:48px 24px;text-align:center;color:var(--ink-500)}
.empty .t-label-md{color:var(--ink-900);margin-top:6px}
@media (max-width:1000px){
  .account{flex-direction:column;align-items:stretch;gap:24px;padding-top:24px}
}
@media (max-width:760px){
  .account{padding-bottom:64px}
  .head{flex-direction:column;align-items:flex-start}
}
</style>
