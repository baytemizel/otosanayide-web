<script setup lang="ts">
import {computed} from 'vue';
import {ArrowRight, Heart, MapPin, Phone, ShieldCheck, Star, Wrench} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import type {MockBusiness} from '~/data/mock/businesses';

// V2/Kart/Servis (Figma 111:55): photo, name + save, verified + location, rating + open state,
// tags, compare checkbox, call and details. States from W02: no photo, unclaimed, no reviews, unknown hours.
// `tags` overrides the default chips (category + brands), e.g. ['Boyasız göçük', 'Kart geçerli'].
const props = withDefaults(defineProps<{business: MockBusiness & {hoursKnown?: boolean; openStateKnown?: boolean}; compared?: boolean; saved?: boolean; highlighted?: boolean; tags?: string[]}>(), {compared: false, saved: false, highlighted: false, tags: undefined});
const hoursKnown = computed(() => props.business.hoursKnown !== false);
const openKnown = computed(() => hoursKnown.value && props.business.openStateKnown !== false);
const chips = computed(() => (props.tags ?? [props.business.category, props.business.brands.join(' · ')]).filter(Boolean));
const emit = defineEmits<{'update:compared': [value: boolean]; 'update:saved': [value: boolean]; hover: [id: string | null]}>();
// Chips and the hours line are Turkish source text in demo data (translated here) or API text that is already
// localised (t() leaves it as it is). Numbers follow the current language (4,5 / 4.5).
const {t, localeTag} = useLocale();
const decimal = (value: number) => value.toLocaleString(localeTag.value, {minimumFractionDigits: 1, maximumFractionDigits: 1});
const km = (value: number | null) => (value === null ? '' : `${decimal(value)} km`);
</script>

<template>
  <article class="v2-service-card" :class="{highlighted}" @mouseenter="emit('hover', business.id)" @mouseleave="emit('hover', null)">
    <div class="photo">
      <img v-if="business.photo" :src="business.photo" alt="" width="1200" height="675" loading="lazy">
      <span v-else class="placeholder" aria-hidden="true"><Wrench :size="22"/><span class="t-mono-sm">{{ t('Fotoğraf yok') }}</span></span>
      <span v-if="business.sponsored" class="sponsor t-mono-sm">{{ t('Sponsorlu') }}</span>
    </div>
    <div class="body">
      <div class="row between">
        <h3 class="t-h4"><NuxtLink :to="`/servis/${business.id}`">{{ business.name }}</NuxtLink></h3>
        <button type="button" class="save" :class="{on: saved}" :aria-pressed="saved" :aria-label="saved ? t('Kaydedilenlerden çıkar') : t('Kaydet')" @click="emit('update:saved', !props.saved)">
          <Heart :size="16" aria-hidden="true"/>
        </button>
      </div>
      <div class="row meta">
        <span v-if="business.verified" class="verified"><ShieldCheck :size="14" aria-hidden="true"/>{{ t('Doğrulanmış') }}</span>
        <span v-else-if="!business.claimed" class="tag tag-cream">{{ t('Sahiplenilmedi') }}</span>
        <span class="place t-body-sm"><MapPin :size="14" aria-hidden="true"/>{{ business.district }}, {{ business.city }}<template v-if="business.distanceKm !== null"> · {{ km(business.distanceKm) }}</template></span>
      </div>
      <div class="row rating">
        <template v-if="business.reviewCount > 0">
          <Star :size="16" class="star" aria-hidden="true"/>
          <span class="t-label-sm">{{ decimal(business.rating) }}</span>
          <span class="t-body-sm t-muted">{{ t('({count} yorum)', {count: business.reviewCount}) }}</span>
        </template>
        <span v-else class="t-body-sm t-muted">{{ t('Henüz yorum yok') }}</span>
        <span class="sep" aria-hidden="true"/>
        <span class="state" :class="{closed: openKnown && !business.open, unknown: !openKnown}" aria-hidden="true"/>
        <span class="t-label-sm hours" :class="{muted: !hoursKnown}">{{ hoursKnown ? t(business.hoursText) : t('Saat bilgisi yok') }}</span>
      </div>
      <div class="row tags">
        <span v-for="chip in chips" :key="chip" class="chip chip-soft">{{ t(chip) }}</span>
      </div>
      <div class="row between actions">
        <label class="compare t-label-sm">
          <input type="checkbox" class="checkbox" :checked="compared" @change="emit('update:compared', ($event.target as HTMLInputElement).checked)">
          {{ t('Karşılaştır') }}
        </label>
        <div class="row">
          <a :href="`tel:${business.phone.replace(/\s/g, '')}`" class="call" :aria-label="t('{name} ara', {name: business.name})"><Phone :size="18" aria-hidden="true"/></a>
          <NuxtLink :to="`/servis/${business.id}`" class="btn btn-outline">{{ t('Detaylar') }}<ArrowRight aria-hidden="true"/></NuxtLink>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.v2-service-card{display:flex;gap:18px;padding:14px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;transition:border-color .15s ease,box-shadow .15s ease}
.v2-service-card.highlighted,.v2-service-card:hover{border:2px solid var(--ink-900);padding:13px;box-shadow:0 18px 20px rgba(10,20,36,.12)}
.photo{position:relative;flex:none;width:176px;border-radius:18px;overflow:hidden;background:var(--cream-100)}
.photo img{width:100%;height:100%;object-fit:cover}
.placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;color:var(--ink-500)}
.sponsor{position:absolute;left:8px;top:8px;padding:5px 10px;border-radius:999px;background:var(--ink-900);color:var(--white)}
.body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.row{display:flex;align-items:center;gap:8px}
.between{justify-content:space-between}
h3{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
h3 a:hover{text-decoration:underline}
.save{flex:none;width:36px;height:36px;border-radius:999px;background:var(--cream-100);display:grid;place-items:center;color:var(--ink-900)}
.save.on{background:var(--orange-100);color:var(--orange-600)}
.save.on :deep(svg){fill:currentColor}
.meta{gap:10px;flex-wrap:wrap}
.verified{display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:999px;background:var(--lime-100);font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.verified :deep(svg){color:var(--green-500)}
.place{display:inline-flex;align-items:center;gap:5px;color:var(--ink-500)}
.rating{gap:6px;flex-wrap:wrap}
.star{color:var(--orange-500);fill:var(--orange-500)}
.sep{width:3px;height:3px;border-radius:999px;background:var(--ink-300)}
.state{width:7px;height:7px;border-radius:999px;background:var(--green-500)}
.state.closed{background:var(--red-500)}
.state.unknown{background:var(--ink-300)}
.hours.muted{color:var(--ink-500)}
.hours{color:var(--ink-800)}
.tags{flex-wrap:wrap}
.compare{display:flex;align-items:center;gap:8px;color:var(--ink-800);cursor:pointer}
.call{width:46px;height:46px;border-radius:999px;background:var(--ink-900);color:var(--white);display:grid;place-items:center}
@media (max-width:760px){
  .v2-service-card{flex-direction:column}
  .photo{width:100%;aspect-ratio:16/9}
  h3{white-space:normal}
}
</style>
