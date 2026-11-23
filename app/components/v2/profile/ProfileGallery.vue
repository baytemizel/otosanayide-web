<script setup lang="ts">
import {LayoutGrid} from '@lucide/vue';
import V2Doodle from '~/components/v2/V2Doodle.vue';
import type {ProfilePhoto} from '~/data/mock/profile';
import {useLocale} from '~/composables/useLocale';

// Gallery strip of W04 (photo profile) and the photo-less cover of W05 (110 px "Fotoğraf yok" doodle).
defineProps<{photos: ProfilePhoto[]; photoCount: number; category: string}>();
const emit = defineEmits<{'open-all': [index: number]}>();
// `category` arrives in the page language; photo alt texts are translated here (demo alts are Turkish source texts).
const {t, localeTag} = useLocale();
</script>

<template>
  <section id="fotograflar" class="profile-gallery v2-wrap" :aria-label="t('Fotoğraflar')">
    <div v-if="photos.length" class="grid">
      <button type="button" class="photo main" @click="emit('open-all', 0)">
        <img :src="photos[0]!.src" :alt="t(photos[0]!.alt)" width="828" height="420">
      </button>
      <div class="side">
        <button v-if="photos[1]" type="button" class="photo" @click="emit('open-all', 1)">
          <img :src="photos[1].src" :alt="t(photos[1].alt)" width="400" height="204">
        </button>
        <div v-if="photos[2]" class="photo last">
          <img :src="photos[2].src" :alt="t(photos[2].alt)" width="400" height="204">
          <button type="button" class="all" @click="emit('open-all', 0)">
            <LayoutGrid :size="16" aria-hidden="true"/><span class="long">{{ t('Tüm fotoğraflar ({count})', {count: photoCount}) }}</span><span class="short" aria-hidden="true">{{ t('Tümü ({count})', {count: photoCount}) }}</span>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="cover">
      <V2Doodle name="bos-foto" :size="110"/>
      <p class="t-mono-md">{{ t('{category} · Fotoğraf henüz eklenmedi', {category}).toLocaleUpperCase(localeTag) }}</p>
    </div>
  </section>
</template>

<style scoped>
.profile-gallery{padding-top:16px;scroll-margin-top:110px}
.grid{display:flex;gap:12px;height:420px}
.photo{position:relative;display:block;overflow:hidden;border-radius:28px;background:var(--cream-100);min-height:0}
.photo img{width:100%;height:100%;object-fit:cover;border-radius:28px;transition:transform .3s ease}
button.photo:hover img{transform:scale(1.02)}
.main{flex:1 1 0;min-width:0;height:100%}
.side{display:flex;flex-direction:column;gap:12px;width:400px;flex:none}
.side .photo{flex:1 1 0;width:100%}
.all{position:absolute;right:16px;bottom:16px;display:inline-flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;border-radius:999px;background:var(--white);box-shadow:0 8px 10px rgba(10,20,36,.2);font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-900);white-space:nowrap}
.short{display:none}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;height:220px;background:var(--cream-100);border:1px solid var(--cream-200);border-radius:28px;padding:20px;text-align:center}
.cover .t-mono-md{color:var(--ink-500);letter-spacing:.04em}
@media (max-width:900px){
  .grid{flex-direction:column;height:auto}
  .main{height:260px;flex:none}
  .side{width:100%;flex-direction:row;height:150px}
  .side .photo{height:100%}
  .all{right:10px;bottom:10px;padding:8px 12px 8px 10px}
}
@media (max-width:480px){
  .main{height:220px}
  .side{height:120px}
  .long{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  .short{display:inline}
  .cover{height:200px}
}
</style>
