<script setup lang="ts">
import {cities} from '@otosanayide/core';
import V2PageHeader from '~/components/v2/V2PageHeader.vue';

// No Web v2 frame exists for this page; it uses the v2 page head and a plain content card.
useSeoMeta({title: 'Hakkında', description: 'Arama ve işletme inceleme için üyelik gerekmez. Araçlarım, favoriler ve katkılar ücretsiz hesaba bağlanır.'});
const sections = [
  {title: 'Ücretsiz kullanım', text: 'Arama ve işletme inceleme için üyelik gerekmez. Araçlarım, favoriler ve katkılar ücretsiz hesaba bağlanır.'},
  {title: 'Konum ve gizlilik', text: 'Konum yalnızca sen istediğinde alınır. İzin vermeden il seçerek arayabilirsin. Arka plan konum takibi yapılmaz.'},
  {title: 'Doğrulama ve reklam', text: 'İşletme sahipliği rozeti kalite garantisi değildir. Sponsorlu görünürlük kullanıcı puanlarını değiştirmez. Ücretli alanlar açıkça reklam olarak etiketlenir.'},
];
</script>

<template>
  <div class="about">
    <V2PageHeader eyebrow="Hakkında" title="Aracına uygun yer. Açık ve anlaşılır bilgi."/>
    <div class="v2-wrap body">
      <section class="surface card">
        <h2 class="t-h4">Başlangıçta 41 il</h2>
        <p class="t-body-md t-muted">{{ cities.join(' · ') }}</p>
      </section>
      <section v-for="section in sections" :key="section.title" class="surface card">
        <h2 class="t-h4">{{ section.title }}</h2>
        <p class="t-body-md t-muted">{{ section.text }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;padding-top:36px;padding-bottom:96px}
.card{display:flex;flex-direction:column;gap:12px;padding:28px}
@media (max-width:760px){.body{grid-template-columns:1fr}}
</style>
