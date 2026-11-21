<script setup lang="ts">
import {computed} from 'vue';
import {Globe} from '@lucide/vue';
import V2Logo from '~/components/v2/V2Logo.vue';
import {useLocale} from '~/composables/useLocale';
import {useCoverage} from '~/composables/v2/useSearch';
import {legalPath} from '~/lib/legal';
import {portalUrl} from '~/lib/portal';

// V2/Footer (Figma 118:498). Links without a live target yet render as plain text.
const {locale, setLocale} = useLocale();
// Province count: live GET /api/coverage, bundled list in demo, during SSR and on failure.
const coverage = useCoverage();

type FooterLink = {label: string; to?: string | null; href?: string | null};
const columns = computed<{title: string; links: FooterLink[]}[]>(() => [
  {title: 'Keşfet', links: [
    {label: 'Hizmetler', to: '/ara'},
    {label: `${coverage.value.cityCount} il`, to: '/ara'},
    {label: 'Belirti Bulucu', to: '/#belirti-bulucu'},
    {label: 'Rehber', to: '/#rehber'},
    {label: 'Yardım'},
  ]},
  {title: 'İşletmeler', links: [
    {label: 'İşletmeni ekle', href: portalUrl('newBusiness')},
    {label: 'Bu işletme benim', href: portalUrl('claim')},
    {label: 'Reklam ve sponsorluk', to: legalPath('reklam-aciklamasi')},
    {label: 'Doğrulama nedir?'},
  ]},
  {title: 'Kurumsal', links: [
    {label: 'Hakkında', to: '/hakkinda'},
    {label: 'Topluluk kuralları', to: legalPath('topluluk-kurallari')},
    {label: 'Reklam açıklaması', to: legalPath('reklam-aciklamasi')},
    {label: 'İletişim'},
  ]},
  {title: 'Yasal', links: [
    {label: 'Kullanım koşulları', to: legalPath('kullanim-kosullari')},
    {label: 'Gizlilik ve KVKK', to: legalPath('gizlilik')},
    {label: 'Çerez tercihleri', to: '/cerez-tercihleri'},
    {label: 'Veri talebi', to: '/hesabim#veri'},
  ]},
]);
</script>

<template>
  <footer class="v2-footer v2-wrap">
    <div class="top">
      <div class="about">
        <V2Logo dark/>
        <p class="t-body-md">Aracına iyi bakacak ustayı ilk seferde bul. Şimdilik {{ coverage.cityCount }} ilde.</p>
        <button type="button" class="lang" @click="setLocale(locale === 'tr' ? 'en' : 'tr')">
          <Globe :size="16" aria-hidden="true"/>{{ locale === 'tr' ? 'Türkçe' : 'English' }}
        </button>
      </div>
      <nav class="cols" aria-label="Alt menü">
        <div v-for="column in columns" :key="column.title" class="col">
          <p class="t-mono-sm head">{{ column.title }}</p>
          <ul>
            <li v-for="link in column.links" :key="link.label">
              <NuxtLink v-if="link.to" :to="link.to">{{ link.label }}</NuxtLink>
              <a v-else-if="link.href" :href="link.href">{{ link.label }}</a>
              <span v-else>{{ link.label }}</span>
            </li>
          </ul>
        </div>
      </nav>
    </div>
    <hr class="rule">
    <div class="bottom t-body-sm">
      <p>© 2026 otosanayide</p>
      <p>Sponsorlu içerik her zaman etiketlidir.</p>
    </div>
  </footer>
</template>

<style scoped>
.v2-footer{display:flex;flex-direction:column;gap:56px;padding-top:80px;padding-bottom:36px;background:var(--ink-900);color:var(--white);overflow:hidden}
.top{display:flex;justify-content:space-between;gap:48px}
.about{display:flex;flex-direction:column;align-items:flex-start;gap:20px;width:340px;flex:none}
.about p{max-width:320px;color:var(--ink-300)}
.lang{display:flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid rgba(255,255,255,.2);border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--white)}
.cols{display:flex;gap:72px}
.col{display:flex;flex-direction:column;gap:14px}
.head{color:var(--lime-400)}
.col ul{display:flex;flex-direction:column;gap:14px}
.col li{font-size:15px;line-height:1.5;color:rgba(255,255,255,.86);white-space:nowrap}
.col a:hover{color:var(--white);text-decoration:underline}
.rule{height:1px;margin:0;border:0;background:rgba(255,255,255,.12)}
.bottom{display:flex;justify-content:space-between;gap:16px;color:var(--ink-300)}
@media (max-width:1180px){
  .top{flex-direction:column}
  .cols{flex-wrap:wrap;gap:40px 56px}
}
@media (max-width:760px){
  .v2-footer{gap:40px;padding-top:56px}
  .about{width:auto}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:32px 24px}
  .col li{white-space:normal}
  .bottom{flex-direction:column}
}
</style>
