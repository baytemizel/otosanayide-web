<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight, Car, Check, Users} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {formatKmValue, vehicleTitle, type MockVehicle} from '~/data/mock/garage';

// W11 "Araç listesi" (Figma 123:272): vehicle cards (selected = 2 px ink border, lime icon, check)
// and the "Aile ile paylaş" invite card. Live: the plate comes from API v2 (there is no "hide plate"
// flag); there is no family-sharing API yet, so the invite card is shown as not available.
const props = withDefaults(defineProps<{vehicles: MockVehicle[]; selectedId: string; live?: boolean}>(), {live: false});
const emit = defineEmits<{select: [id: string]}>();
const {t, localeTag} = useLocale();

const plateText = (v: MockVehicle) => {
  if (!v.plate) return t('Plaka eklenmedi');
  return !props.live && v.plateHidden ? t('{plate} (gizli)', {plate: v.plate}) : v.plate;
};

const inviting = ref(false);
const email = ref('');
const error = ref('');
const sent = ref('');
function sendInvite() {
  const value = email.value.trim();
  error.value = !value ? t('E-posta adresini yaz.') : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : t('Geçerli bir e-posta adresi yaz.');
  if (error.value) return;
  sent.value = value;
  email.value = '';
  inviting.value = false;
}
</script>

<template>
  <div class="vehicle-list">
    <ul class="cards" :aria-label="t('Araçlar')">
      <li v-for="v in vehicles" :key="v.id">
        <button type="button" class="vehicle" :class="{on: v.id === selectedId}" :aria-pressed="v.id === selectedId" @click="emit('select', v.id)">
          <span class="car" aria-hidden="true"><Car :size="22"/></span>
          <span class="copy">
            <span class="name">{{ vehicleTitle(v) }}</span>
            <span class="t-body-sm t-muted">{{ plateText(v) }} · {{ formatKmValue(v.km, localeTag) }}</span>
          </span>
          <span v-if="v.id === selectedId" class="tick" aria-hidden="true"><Check :size="14" :stroke-width="2.5"/></span>
        </button>
      </li>
    </ul>

    <section class="share" aria-labelledby="share-title">
      <h2 id="share-title" class="share-title t-label-md"><Users :size="20" aria-hidden="true"/>{{ t('Aile ile paylaş') }}</h2>
      <template v-if="live">
        <p class="t-body-sm t-muted">{{ t('Aile paylaşımı henüz etkin değil. Açıldığında davet ettiğin kişi yalnız bu aracın kayıtlarını görecek.') }}</p>
        <button type="button" class="btn btn-outline" disabled aria-disabled="true">{{ t('Davet gönder') }}<ArrowRight aria-hidden="true"/></button>
      </template>
      <template v-else>
        <p class="t-body-sm t-muted">{{ t('Davet ettiğin kişi yalnız bu aracın kayıtlarını görür.') }}</p>
        <p v-if="sent && !inviting" class="sent t-body-sm" role="status"><Check :size="16" aria-hidden="true"/>{{ t('Davet {email} adresine gönderildi.', {email: sent}) }}</p>
        <form v-if="inviting" class="invite" novalidate @submit.prevent="sendInvite">
          <label class="sr-only" for="invite-email">{{ t('Davet edilecek e-posta adresi') }}</label>
          <input id="invite-email" v-model="email" class="input" type="email" :placeholder="t('aile@ornek.com')" autocomplete="email" :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? 'invite-err' : undefined">
          <p v-if="error" id="invite-err" class="err" role="alert">{{ error }}</p>
          <div class="invite-actions">
            <button type="submit" class="btn btn-dark btn-sm">{{ t('Gönder') }}<ArrowRight aria-hidden="true"/></button>
            <button type="button" class="btn btn-ghost btn-sm" @click="inviting = false; error = ''">{{ t('Vazgeç') }}</button>
          </div>
        </form>
        <button v-else type="button" class="btn btn-outline" @click="inviting = true">{{ t('Davet gönder') }}<ArrowRight aria-hidden="true"/></button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.vehicle-list{display:flex;flex-direction:column;gap:16px}
.cards{display:flex;flex-direction:column;gap:16px}
.vehicle{width:100%;display:flex;align-items:center;gap:14px;padding:18px;text-align:left;background:var(--white);border:1px solid var(--cream-200);border-radius:24px;transition:border-color .15s ease}
.vehicle:hover{border-color:var(--ink-300)}
.vehicle.on{border:2px solid var(--ink-900)}
.car{flex:none;width:48px;height:48px;border-radius:999px;display:grid;place-items:center;background:var(--cream-100);color:var(--ink-900)}
.on .car{background:var(--lime-400)}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.copy > span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.name{font-weight:600;font-size:17px;line-height:1.2;color:var(--ink-900)}
.tick{flex:none;width:26px;height:26px;border-radius:999px;display:grid;place-items:center;background:var(--ink-900);color:var(--lime-400)}
.share{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:20px;border-radius:24px;background:var(--cream-100)}
.share-title{display:flex;align-items:center;gap:10px;color:var(--ink-900)}
.sent{display:flex;align-items:center;gap:6px;color:var(--green-500);font-weight:600}
.invite{align-self:stretch;display:flex;flex-direction:column;gap:8px}
.invite-actions{display:flex;gap:4px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
</style>
