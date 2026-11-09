<script setup lang="ts">
import {categories, type Business} from '@otosanayide/core';
import BusinessVisual from '~/components/BusinessVisual.vue';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();

function previewOf(c: (typeof categories)[number]): Business {
  return {id: `visual-${c.id}`, name: c.name, city: '', district: '', address: '', categories: [c.id], services: c.services, brands: [], ownership: 'unclaimed', coordinateStatus: 'unverified', features: {quotes: false, appointments: false}, ownerReady: false, published: false, sample: true};
}
</script>

<template>
  <section>
    <h2>{{ i18nT('Hizmet kategorileri') }}</h2>
    <p class="muted">{{ i18nT('Fotoğrafsız kart tasarımları. Bunlar işletme kaydı değildir; hizmet ve görsel önizlemeleridir.') }}</p>
    <div class="category-catalogue">
      <article v-for="c in categories" :key="c.id" class="category-preview">
        <div class="card-media"><BusinessVisual :business="previewOf(c)"/></div>
        <div class="card-body">
          <h3>{{ i18nT(c.name) }}</h3>
          <p>{{ c.services.map(s=>i18nT(s)).join(' · ') }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
