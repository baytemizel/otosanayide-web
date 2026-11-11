<script setup lang="ts">
import {ref} from 'vue';
import {Check} from '@lucide/vue';
import {claimStatusLabels} from '@otosanayide/core/claim-status';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {Claim, Decision} from '~/lib/claim-review-panel-helpers';

const props = defineProps<{claim: Claim; verificationReference: string | null; onDecision: (decision: Decision, reason: string) => Promise<void>}>();
const {t: i18nT} = useLocale();
const reason = ref('');
const checked = ref(false);
const busy = ref(false);
const error = ref('');

useClientEffect(() => [props.verificationReference], () => {
  checked.value = false;
});

async function decide(decision: Decision) {
  error.value = '';
  if (reason.value.trim().length < 10) {
    error.value = 'En az 10 karakterlik karar gerekçesi yaz.';
    return;
  }
  busy.value = true;
  try {
    await props.onDecision(decision, reason.value.trim());
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="claim-grid">
    <section class="ds-card claim-main ds-col ds-g16">
      <div class="ds-row ds-sb ds-as ds-g12 ds-wrap">
        <div class="ds-col ds-f1" style="min-width:200px">
          <h2 style="font-size:28px;line-height:1.12;margin:0;overflow-wrap:anywhere">{{ claim.name }}</h2>
          <span class="ds-small ds-muted" style="overflow-wrap:anywhere">{{ claim.city }} · {{ claim.address }}</span>
        </div>
        <span class="ds-badge warn">{{ claimStatusLabels[claim.status]??i18nT('İncelemede') }}</span>
      </div>
      <div class="claim-facts">
        <div class="ds-col ds-g4"><span class="ds-xs ds-muted">{{ i18nT('Başvuran') }}</span><span class="ds-b" style="font-size:15px;overflow-wrap:anywhere">{{ claim.contactName }}</span><span class="ds-xs ds-muted">{{ claim.phone }}</span></div>
        <div class="ds-col ds-g4 ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span class="ds-xs ds-muted">{{ i18nT('Rol') }}</span></div>
        <div class="ds-col ds-g4 ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span class="ds-xs ds-muted">{{ i18nT('Risk') }}</span></div>
      </div>
      <div v-if="claim.note" class="ds-small" style="overflow-wrap:anywhere">{{ i18nT('Başvuru notu: ') }}{{ claim.note }}</div>
      <div v-if="claim.reply" class="ds-small" style="overflow-wrap:anywhere">{{ i18nT('Son ek açıklama: ') }}{{ claim.reply }}</div>
      <div v-if="!claim.businessId" class="ds-note warn">{{ i18nT('Yeni nokta başvurusu. Sahiplik onayından önce işletme kaydıyla eşleme gerekiyor.') }}</div>
      <h4 style="font-size:16px;margin:0">{{ i18nT('Kanıtlar') }}</h4>
      <slot name="evidence"/>
      <label class="ds-col"><span class="ds-label">{{ i18nT('Karar notu (başvurana gösterilir)') }}</span><textarea v-model="reason" class="ds-field" style="height:80px" maxlength="1000" :disabled="busy"/></label>
      <label class="ds-row ds-as ds-g10 ds-small"><input v-model="checked" class="ds-check" type="checkbox" :disabled="!verificationReference||busy"/>{{ i18nT('Güncel belge incelemesi tamamlandı; başvuru yetkisini onaylıyorum.') }}</label>
      <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
      <div class="ds-row ds-wrap ds-g10">
        <button class="ds-btn n" :disabled="busy||!checked||!verificationReference||!claim.businessId" @click="decide('approve')"><Check :size="16"/>{{ i18nT('Onayla') }}</button>
        <button class="ds-btn s" :disabled="busy" @click="decide('request_information')">{{ i18nT('Ek bilgi iste') }}</button>
        <button class="ds-btn d" :disabled="busy" @click="decide('reject')">{{ i18nT('Reddet') }}</button>
      </div>
      <div class="ds-xs ds-muted">{{ i18nT('Onay yalnızca ilgili işletmeye yönetim yetkisi verir. Yayın, konum doğrulaması, randevu ve teklif özellikleri ayrıca değerlendirilir.') }}</div>
    </section>
    <aside class="ds-col ds-g16">
      <div class="ds-card ds-passive" aria-disabled="true" :title="i18nT('Yakında')" style="overflow:hidden">
        <div class="ds-mapbg" style="height:200px"/>
        <div class="ds-pad16 ds-xs ds-muted">{{ i18nT('Lacivert: katalog konumu · Turuncu: fotoğraf konumu') }}</div>
      </div>
      <div class="ds-card ds-pad ds-col ds-g8 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
        <h4 style="font-size:16px;margin:0">{{ i18nT('Aynı şube için başka başvuru') }}</h4>
        <div class="ds-small ds-muted">{{ i18nT('İkinci başvuru otomatik devralamaz, ihtilaf açılır.') }}</div>
      </div>
      <div class="ds-card ds-pad ds-col ds-g8 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
        <h4 style="font-size:16px;margin:0">{{ i18nT('İşlem kaydı') }}</h4>
        <div class="ds-small ds-muted">{{ i18nT('Bu ekranda henüz gösterilmiyor.') }}</div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.claim-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;align-items:start}
.claim-main{padding:28px}
.claim-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
input.ds-check{width:20px;height:20px;min-height:0;padding:0}
@media(max-width:1100px){.claim-grid{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.claim-main{padding:20px}.claim-facts{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
