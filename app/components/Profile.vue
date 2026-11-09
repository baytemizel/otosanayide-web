<script setup lang="ts">
import {ArrowUpRight, Heart, MapPin, MessageSquare, ShieldCheck} from '@lucide/vue';
import {featureAvailable, type Business} from '@otosanayide/core';
import BusinessEmail from '~/components/BusinessEmail.vue';
import BusinessPublicGallery from '~/components/BusinessPublicGallery.vue';
import BusinessVisual from '~/components/BusinessVisual.vue';
import ContactMenu from '~/components/ContactMenu.vue';
import Reviews from '~/components/Reviews.vue';
import ServiceLocationCard from '~/components/ServiceLocationCard.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{business: Business}>();

const {t: i18nT} = useLocale();
const app = useApp();

function toggle() {
  app.toggleFavorite(props.business.id).catch((e: Error) => app.notify(e.message));
}
</script>

<template>
  <div class="container page" id="content">
    <NuxtLink class="breadcrumb" to="/">{{ i18nT('Keşfet / ') }}{{ business.city }} / {{ business.district }}</NuxtLink>
    <div class="profile-header">
      <div>
        <h1>{{ business.name }}</h1>
        <p class="row muted"><MapPin :size="18"/>{{ business.district }}, {{ business.city }}<span v-if="business.ownership==='verified'" class="row verified"><ShieldCheck :size="18"/>{{ i18nT('İşletme sahipliği doğrulandı') }}</span></p>
        <p class="row small muted"><MessageSquare :size="16"/>{{ i18nT('Müşteri deneyimleri aşağıda') }}</p>
      </div>
      <button class="button secondary" @click="toggle"><Heart :size="18" :fill="app.data.favorites.includes(business.id)?'currentColor':'none'"/>{{ i18nT('Kaydet') }}</button>
    </div>
    <p v-if="business.sample" class="notice">{{ i18nT('Bu bir örnek işletmedir. Görseller temsilidir; iletişim veya randevu oluşturulmaz.') }}</p>
    <div class="profile-grid">
      <div>
        <BusinessVisual :business="business" large/>
        <BusinessPublicGallery :businessId="business.id" :sample="business.sample"/>
        <section class="section">
          <h2>{{ i18nT('Aracın için neler yapıyor?') }}</h2>
          <div class="tags large">
            <span v-for="s in business.services" :key="s">{{ i18nT(s) }}</span>
          </div>
          <h3>{{ i18nT('Hizmet verilen markalar') }}</h3>
          <p>{{ business.brands.length?business.brands.join(' · '):i18nT('Marka uzmanlığı henüz belirtilmedi.') }}</p>
        </section>
        <Reviews :key="business.id" :businessId="business.id" :sample="business.sample"/>
      </div>
      <aside class="service-sidebar">
        <ServiceLocationCard :business="business"/>
        <div class="panel contact-panel">
          <h2>{{ i18nT('İletişim') }}</h2>
          <ContactMenu :phone="business.phone" :name="business.name" :sample="business.sample"/>
          <BusinessEmail :address="business.contactEmail" :sample="business.sample"/>
          <hr/>
          <p><strong>{{ i18nT('Çalışma saatleri') }}</strong><br/>{{ business.hours??i18nT('Henüz belirtilmedi') }}</p>
          <p><strong>{{ i18nT('Kartla ödeme') }}</strong><br/>{{ business.cardPayment===true?i18nT('Var'):business.cardPayment===false?i18nT('Yok'):i18nT('Bilinmiyor') }}</p>
          <p><strong>{{ i18nT('WC') }}</strong><br/>{{ business.wc===true?i18nT('Var'):business.wc===false?i18nT('Yok'):i18nT('Bilinmiyor') }}</p>
          <NuxtLink v-if="featureAvailable(business,'quotes')" class="button primary full" :to="`/talep?business=${business.id}&kind=quotes`">{{ i18nT('Teklif iste') }}</NuxtLink>
          <NuxtLink v-if="featureAvailable(business,'appointments')" class="button secondary full" :to="`/talep?business=${business.id}&kind=appointments`">{{ i18nT('Randevu iste') }}</NuxtLink>
        </div>
        <div class="ownership-callout">
          <h3>{{ i18nT('Bu işletme senin mi?') }}</h3>
          <p>{{ i18nT('Profilini ücretsiz sahiplen. Bilgilerini yönet, müşterilerinle iletişim kur.') }}</p>
          <NuxtLink :to="`/isletme?claim=${business.id}`" class="text-link">{{ i18nT('İşletmeni sahiplen ') }}<ArrowUpRight :size="17"/></NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
