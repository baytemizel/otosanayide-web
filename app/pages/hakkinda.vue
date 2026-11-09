<script setup lang="ts">
import {cities} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
</script>

<template>
  <article class="container page prose" id="content">
    <h1>{{ i18nT("Aracına uygun yer.") }}<br/>{{ i18nT("Açık ve anlaşılır bilgi.") }}</h1>
    <h2>{{ i18nT("Başlangıçta 41 il") }}</h2>
    <p>{{ cities.join(' · ') }}</p>
    <h2>{{ i18nT("Ücretsiz kullanım") }}</h2>
    <p>{{ i18nT("Arama ve işletme inceleme için üyelik gerekmez. Araçlarım, favoriler ve katkılar ücretsiz hesaba bağlanır.") }}</p>
    <h2>{{ i18nT("Geliştirme önizlemesi") }}</h2>
    <p>{{ i18nT("Bu sürümde örnek işletmeler ve temsilî görseller bulunur. Demo hesabı gerçek üyelik değildir; araç ve bakım kayıtları yalnızca bu tarayıcıda saklanır. Gerçek kişisel veya ticari belge girmeyin.") }}</p>
    <h2>{{ i18nT("Konum ve gizlilik") }}</h2>
    <p>{{ i18nT("Konum yalnızca sen istediğinde alınır. İzin vermeden il seçerek arayabilirsin. Arka plan konum takibi yapılmaz. Canlı kullanımın gizlilik, saklama, hesap silme ve çerez metinleri yayına hazırlık aşamasında tamamlanacaktır.") }}</p>
    <h2>{{ i18nT("Doğrulama ve reklam") }}</h2>
    <p>{{ i18nT("İşletme sahipliği rozeti kalite garantisi değildir. Sponsorlu görünürlük kullanıcı puanlarını değiştirmez. Ücretli alanlar açıkça reklam olarak etiketlenir.") }}</p>
  </article>
</template>
