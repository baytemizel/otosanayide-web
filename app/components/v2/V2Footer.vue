<script setup lang="ts">
import {computed} from 'vue';
import {Globe} from '@lucide/vue';
import V2Logo from '~/components/v2/V2Logo.vue';
import V2Select from '~/components/v2/V2Select.vue';
import {localeOptions, useLocale} from '~/composables/useLocale';
import {useCoverage} from '~/composables/v2/useSearch';
import {legalPath} from '~/lib/legal';
import {portalUrl} from '~/lib/portal';

// V2/Footer (Figma 118:498). Links without a live target yet render as plain text.
const {locale, setLocale, t} = useLocale();
function chooseLocale(next: string) {
  const option = localeOptions.find((item) => item.value === next);
  if (option && option.value !== locale.value) setLocale(option.value);
}
// Province count: live GET /api/coverage, bundled list in demo, during SSR and on failure.
const coverage = useCoverage();

type FooterLink = {label: string; to?: string | null; href?: string | null};
// Built inside a computed, so the labels follow a language change.
const columns = computed<{title: string; links: FooterLink[]}[]>(() => [
  {title: t('Keşfet'), links: [
    {label: t('Hizmetler'), to: '/ara'},
    {label: t('{count} il', {count: coverage.value.cityCount}), to: '/ara'},
    {label: t('Belirti Bulucu'), to: '/#belirti-bulucu'},
    {label: t('Rehber'), to: '/#rehber'},
    {label: t('Yardım')},
  ]},
  {title: t('İşletmeler'), links: [
    {label: t('İşletmeni ekle'), href: portalUrl('newBusiness')},
    {label: t('Bu işletme benim'), href: portalUrl('claim')},
    {label: t('Reklam ve sponsorluk'), to: legalPath('reklam-aciklamasi')},
    {label: t('Doğrulama nedir?')},
  ]},
  {title: t('Kurumsal'), links: [
    {label: t('Hakkında'), to: '/hakkinda'},
    {label: t('Topluluk kuralları'), to: legalPath('topluluk-kurallari')},
    {label: t('Reklam açıklaması'), to: legalPath('reklam-aciklamasi')},
    {label: t('İletişim', {ctx: 'contact'})},
  ]},
  {title: t('Yasal'), links: [
    {label: t('Kullanım koşulları'), to: legalPath('kullanim-kosullari')},
    {label: t('Gizlilik ve KVKK'), to: legalPath('gizlilik')},
    {label: t('Çerez tercihleri'), to: '/cerez-tercihleri'},
    {label: t('Veri talebi'), to: '/hesabim#veri'},
  ]},
]);
</script>

<template>
  <footer class="v2-footer v2-wrap">
    <div class="top">
      <div class="about">
        <V2Logo dark/>
        <p class="t-body-md">{{ t('Aracına iyi bakacak ustayı ilk seferde bul. Şimdilik {count} ilde.', {count: coverage.cityCount}) }}</p>
        <div class="lang-slot">
          <V2Select
            class="lang" variant="bare" :match-width="false" :aria-label="t('Dil')"
            :model-value="locale" :options="localeOptions" @update:model-value="chooseLocale">
            <template #value="{item}">
              <span class="lang-value"><Globe :size="16" aria-hidden="true"/>{{ item?.label }}</span>
            </template>
          </V2Select>
        </div>
      </div>
      <nav class="cols" :aria-label="t('Alt menü')">
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
      <p>{{ t('Sponsorlu içerik her zaman etiketlidir.') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.v2-footer{display:flex;flex-direction:column;gap:56px;padding-top:80px;padding-bottom:36px;background:var(--ink-900);color:var(--white);overflow:hidden}
.top{display:flex;justify-content:space-between;gap:48px}
.about{display:flex;flex-direction:column;align-items:flex-start;gap:20px;width:340px;flex:none}
.about p{max-width:320px;color:var(--ink-300)}
.lang-slot{display:flex}
/* V2Select renders a fragment, so its trigger is reached with :deep() from the wrapper. */
.lang-slot :deep(.lang){display:flex;align-items:center;gap:6px;padding:9px 12px 9px 14px;border:1px solid rgba(255,255,255,.2);border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--white)}
.lang-slot :deep(.lang:hover),.lang-slot :deep(.lang.open){border-color:rgba(255,255,255,.5)}
.lang-slot :deep(.lang:focus-visible){outline:none;box-shadow:0 0 0 3px rgba(243,107,33,.35)}
.lang-slot :deep(.lang .v2-select-chev){width:14px;height:14px;color:currentColor}
/* Block flex: an inline box would sit on the text baseline, about 2px above the chevron. */
.lang-value{display:flex;align-items:center;gap:6px;line-height:16px}
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
