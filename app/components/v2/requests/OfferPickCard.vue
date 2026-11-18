<script setup lang="ts">
import {computed} from 'vue';
import {Star, Wrench} from '@lucide/vue';
import {formatRating} from '~/data/mock/businesses';
import {requestBusiness} from '~/data/mock/requests';
import {formatMoney, type OfferCardView, type OfferStatus} from '~/lib/v2/requests';

// One incoming offer in the W15 offer list. Selecting it shows its detail above;
// interaction note 07: the selected offer gets the orange frame.
// `business` is passed in live mode (name only); demo looks the mock business up.
const props = defineProps<{offer: OfferCardView; status: OfferStatus; selected: boolean; cheapest?: boolean; business?: {name: string; photo?: string | null; rating?: number; district?: string}}>();
const emit = defineEmits<{select: []}>();
const business = computed(() => props.business ?? requestBusiness(props.offer.businessId));
const total = computed(() => props.offer.lines.reduce((sum, line) => sum + line.amount, 0));
const statusText = computed(() => ({pending: `Geçerlilik: ${props.offer.validUntil}`, accepted: 'Kabul edildi', rejected: 'Reddedildi'})[props.status]);
</script>

<template>
  <button type="button" class="pick" :class="{selected, rejected: status === 'rejected'}" :aria-pressed="selected" @click="emit('select')">
    <span class="head">
      <img v-if="business?.photo" :src="business.photo" alt="" class="photo" width="44" height="44">
      <span v-else class="photo empty" aria-hidden="true"><Wrench :size="18"/></span>
      <span class="who">
        <span class="t-label-md name">{{ business?.name }}</span>
        <span v-if="business?.rating !== undefined && business.district" class="t-body-sm t-muted rating"><Star :size="13" aria-hidden="true"/>{{ formatRating(business.rating) }} · {{ business.district }}</span>
      </span>
    </span>
    <span class="price">
      <span class="t-mono-sm t-muted">TOPLAM (TAHMİNİ)</span>
      <strong>{{ formatMoney(total) }}</strong>
    </span>
    <span class="foot">
      <span class="t-body-sm" :class="status === 'pending' ? 't-muted' : 'state'">{{ statusText }}</span>
      <span v-if="cheapest && status !== 'rejected'" class="tag tag-lime tag-mono">EN UYGUN</span>
    </span>
  </button>
</template>

<style scoped>
.pick{display:flex;flex-direction:column;align-items:stretch;gap:16px;width:100%;padding:20px;text-align:left;background:var(--white);border:1px solid var(--cream-200);border-radius:24px;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.pick:hover{transform:translateY(-2px);border-color:var(--ink-300)}
.pick.selected{border:2px solid var(--orange-500);padding:19px;box-shadow:0 0 0 4px rgba(243,107,33,.12)}
.pick.rejected{background:var(--cream-50)}
.head{display:flex;align-items:center;gap:12px;min-width:0}
.photo{width:44px;height:44px;flex:none;border-radius:14px;object-fit:cover}
.photo.empty{display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500)}
.who{display:flex;flex-direction:column;gap:3px;min-width:0}
.name{color:var(--ink-900);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rating{display:flex;align-items:center;gap:4px}
.rating svg{color:var(--amber-400);fill:var(--amber-400)}
.price{display:flex;flex-direction:column;gap:4px}
.price strong{font-weight:700;font-size:22px;line-height:1.2;color:var(--ink-900)}
.rejected .price strong{text-decoration:line-through;color:var(--ink-500)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}
.state{font-weight:600;color:var(--ink-800)}
</style>
