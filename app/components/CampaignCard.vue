<script setup lang="ts">
import {computed,ref} from 'vue';
import {Check,Heart,Home,ImageOff,Info,LayoutGrid,MapPin,Megaphone,Search} from '@lucide/vue';
import {categories} from '@otosanayide/core';
import {campaignInput,type CampaignView,type CampaignAction} from '@otosanayide/core/campaigns';
import LiveCampaignBooking from '~/components/LiveCampaignBooking.vue';
import LiveCampaignMetrics from '~/components/LiveCampaignMetrics.vue';
import {useLocale} from '~/composables/useLocale';
import {campaignLabels,type CampaignBranch} from '~/lib/campaigns-helpers';

const placements={search:'Arama sonuçları',category:'Kategori',home:'Ana sayfa'};

const props=withDefaults(defineProps<{value:CampaignView;branch:CampaignBranch;admin?:boolean;demo?:boolean;onAction:(a:CampaignAction)=>Promise<void>}>(),{admin:false,demo:false});

const {t}=useLocale();
const form=ref<CampaignView>(props.value);
const reason=ref('');
const busy=ref(false);
const error=ref('');
const message=ref('');

const editable=computed(()=>!props.admin&&['draft','rejected'].includes(props.value.status));
const dirty=computed(()=>JSON.stringify(form.value)!==JSON.stringify(props.value));
const minStartDate=()=>new Date(Date.now()+27*3600000).toISOString().slice(0,10);

async function send(action:CampaignAction['action']){
  busy.value=true;
  error.value='';
  message.value='';
  try{
    const base={id:props.value.id,businessId:props.value.businessId,version:props.value.version};
    const fields={placement:form.value.placement,city:form.value.city,category:form.value.category,days:form.value.days,startDate:form.value.startDate,headline:form.value.headline,description:form.value.description};
    const input:CampaignAction=action==='save'?{...base,action,value:campaignInput.parse(fields)}:action==='approve'||action==='reject'?{...base,action,reason:reason.value}:{...base,action};
    if(props.demo){
      message.value='Önizleme kontrol edildi. Kampanya kaydedilmedi veya yayımlanmadı.';
      return;
    }
    await props.onAction(input);
    message.value='Kampanya işlemi kaydedildi.';
  }catch(e){
    error.value=e instanceof Error&&!e.message.startsWith('[')?e.message:'Kampanya alanlarını kontrol et.';
  }finally{
    busy.value=false;
  }
}
const packs=[
  {key:'search',icon:Search,title:'Aramada öne çıkma',desc:'Eşleşen kategori ve ilde “Sponsorlu” kart',term:'7 / 30 gün',lines:['Sonuçlarda “Sponsorlu” etiketiyle gösterilir','Filtre dışına çıkmaz, yıldız değişmez','Ölçüm: gösterim ve tıklama']},
  {key:'category',icon:LayoutGrid,title:'Kategoride öne çıkma',desc:'İl + kategori sayfasındaki sponsor alanı',term:'Dönem ve envanter bazlı',lines:['Kategori ve il hedefleme','Sınırlı slot, süreli rezervasyon','Organik sıralamayı etkilemez']},
  {key:'home',icon:Home,title:'Ana sayfa görünürlüğü',desc:'Seçili konuma uygun öne çıkan alan',term:'Ayrı paket · sınırlı rotasyon',lines:['İl bazlı gösterim','Masaüstü ve mobil varyant','Kreatif moderasyonu']},
] as const;
const tones={draft:'neu',pending:'warn',approved:'info',rejected:'err',cancelled:'neu',scheduled:'ok'};
const previewMode=ref<'desktop'|'mobile'>('desktop');
const packName=computed(()=>packs.find(p=>p.key===form.value.placement)?.title??placements[form.value.placement]);
const categoryName=computed(()=>t(categories.find(c=>c.id===form.value.category)?.name??form.value.category));
</script>

<template>
  <article class="ds-col ds-g20">
    <div class="ds-row ds-sb ds-g12 ds-wrap">
      <div class="ds-row ds-g8 ds-f1">
        <Megaphone class="ds-orange ds-i" :size="20" aria-hidden="true"/>
        <h3 class="brk">{{ branch.name }}</h3>
      </div>
      <span :class="['ds-badge',tones[value.status]]">{{ t(campaignLabels[value.status]) }}</span>
    </div>
    <p class="ds-note info">{{ t('Onay reklamı yayımlamaz. Tarife, boş alan ve doğrulanmış ödeme olmadan kampanya başlamaz.') }}</p>
    <fieldset v-if="editable" :disabled="busy" class="fs ds-col ds-g12">
      <legend class="ds-label">{{ t('Kampanya hedefi') }}</legend>
      <div class="packs">
        <div v-for="p in packs" :key="p.key" :class="['pack',form.placement===p.key?'on':'']">
          <span v-if="p.key==='search'" class="ds-badge sp">{{ t('Önerilen başlangıç') }}</span>
          <span v-else class="gap" aria-hidden="true"></span>
          <span class="pi"><component :is="p.icon" :size="24" :stroke-width="1.8" aria-hidden="true"/></span>
          <h4>{{ t(p.title) }}</h4>
          <p class="ds-small ds-muted">{{ t(p.desc) }}</p>
          <p class="ds-small ds-b">{{ t(p.term) }}</p>
          <div class="ds-divider"></div>
          <ul class="ds-col ds-g6">
            <li v-for="line in p.lines" :key="line"><Check class="ds-green ds-i" :size="15" aria-hidden="true"/><span>{{ t(line) }}</span></li>
          </ul>
          <button type="button" :aria-pressed="form.placement===p.key" :class="['ds-btn','cta',form.placement===p.key?'p':'s']" @click="form={...form,placement:p.key}">{{ t('Seç ve planla') }}</button>
        </div>
      </div>
      <p class="ds-note info"><Info class="ds-i" :size="16" aria-hidden="true"/><span>{{ t('Fiyatlar alan × il × kategori × dönem tarifesinden sunucuda hesaplanır. “Tüm aramalarda birinci” sözü verilmez.') }}</span></p>
    </fieldset>
    <div class="plan">
      <div class="ds-card ds-pad24 ds-col ds-g20">
        <fieldset v-if="editable" :disabled="busy" class="fs ds-col ds-g20">
          <legend class="lg">{{ t('Hedefleme') }}</legend>
          <div class="grid">
            <label class="fld"><span class="ds-label">{{ t('İl') }}</span><input class="ds-field" :value="form.city" readonly/></label>
            <label class="fld"><span class="ds-label">{{ t('Bölge') }}</span><select class="ds-field ds-passive" disabled aria-disabled="true" :title="t('Yakında')"><option>{{ t('Yakında') }}</option></select></label>
          </div>
          <div>
            <span class="ds-label lb">{{ t('Kategori (profilinizde açık olanlar)') }}</span>
            <div class="ds-row ds-g8 ds-wrap" role="group" :aria-label="t('Kategori')">
              <button v-for="id in branch.categories" :key="id" type="button" :aria-pressed="form.category===id" :class="['ds-chip',form.category===id?'on':'line']" @click="form={...form,category:id}">{{ t(categories.find(c=>c.id===id)?.name??id) }}</button>
            </div>
          </div>
          <div>
            <span class="ds-label lb">{{ t('Dönem ve slot') }}</span>
            <div class="grid">
              <label class="fld"><span class="ds-label">{{ t('İstenen başlangıç tarihi') }}</span><input class="ds-field" type="date" :min="minStartDate()" :value="form.startDate" @input="form={...form,startDate:($event.target as HTMLInputElement).value}"/></label>
              <label class="fld"><span class="ds-label">{{ t('Kampanya süresi') }}</span><select class="ds-field" :value="form.days" @change="form={...form,days:Number(($event.target as HTMLSelectElement).value) as 7|30}"><option :value="7">{{ t('7 gün') }}</option><option :value="30">{{ t('30 gün') }}</option></select></label>
            </div>
            <div class="slot ds-passive" aria-disabled="true" :title="t('Yakında')"><span class="ds-small ds-b">{{ t('Haftalık slot takvimi') }}</span><span class="ds-badge neu">{{ t('Yakında') }}</span></div>
            <p class="ds-help">{{ t('Tarih ve süre talebidir; yer rezervasyonu veya tüm aramalarda ilk sıra garantisi değildir. Fotoğraf olmadan da kampanya hazırlanabilir.') }}</p>
          </div>
          <div class="ds-col ds-g12">
            <label class="fld"><span class="ds-label">{{ t('Reklam başlığı') }}</span><input class="ds-field" minlength="5" maxlength="80" :value="form.headline" @input="form={...form,headline:($event.target as HTMLInputElement).value}"/></label>
            <label class="fld"><span class="ds-label">{{ t('Reklam açıklaması') }}</span><textarea class="ds-field" minlength="10" maxlength="300" :value="form.description" @input="form={...form,description:($event.target as HTMLTextAreaElement).value}"></textarea></label>
          </div>
        </fieldset>
        <template v-else>
          <h3>{{ t('Hedefleme') }}</h3>
          <p>{{ t(placements[value.placement]) }} · {{ value.city }} · {{ t(categories.find(c=>c.id===value.category)?.name??value.category) }} · {{ value.startDate }} · {{ value.days }} {{ t('gün') }}</p>
          <p class="ds-small ds-muted">{{ t('Tarih ve süre talebidir; yer rezervasyonu veya tüm aramalarda ilk sıra garantisi değildir. Fotoğraf olmadan da kampanya hazırlanabilir.') }}</p>
        </template>
        <a v-if="admin" class="ds-btn s st" :href="`/servis/${encodeURIComponent(value.businessId)}`" target="_blank" rel="noopener noreferrer">{{ t('İşletme profilini aç') }}</a>
        <p v-if="value.reason"><strong>{{ t('Gerekçe') }}: </strong>{{ value.reason }}</p>
        <label v-if="admin&&value.status==='pending'" class="fld"><span class="ds-label">{{ t('İnceleme gerekçesi') }}</span><textarea v-model="reason" class="ds-field" :disabled="busy" minlength="10" maxlength="1000"></textarea></label>
      </div>
      <div class="ds-col ds-g16">
        <div class="ds-card ds-pad24 ds-col ds-g12">
          <div class="ds-row ds-sb ds-g8 ds-wrap">
            <h3>{{ t('Önizleme') }}</h3>
            <div class="ds-seg">
              <button type="button" :class="{on:previewMode==='desktop'}" :aria-pressed="previewMode==='desktop'" @click="previewMode='desktop'">{{ t('Masaüstü') }}</button>
              <button type="button" :class="{on:previewMode==='mobile'}" :aria-pressed="previewMode==='mobile'" @click="previewMode='mobile'">{{ t('Mobil') }}</button>
            </div>
          </div>
          <div :class="['ad',previewMode==='mobile'?'m':'']">
            <div class="media ds-surface">
              <span class="ds-badge sp tag">{{ t('Sponsorlu') }}</span>
              <span class="heart ds-passive" aria-disabled="true" :title="t('Yakında')"><Heart :size="17" aria-hidden="true"/></span>
              <ImageOff class="ds-muted" :size="28" :stroke-width="1.8" aria-hidden="true"/>
              <span class="ds-xs ds-muted">{{ t('Fotoğraf yok') }}</span>
            </div>
            <div class="ds-pad ds-col ds-g10">
              <strong class="nm brk">{{ branch.name }}</strong>
              <span class="ds-row ds-g6 ds-small ds-muted"><MapPin class="ds-i" :size="15" aria-hidden="true"/>{{ form.city }}</span>
              <h4 class="brk">{{ form.headline||t('Reklam başlığın burada görünecek.') }}</h4>
              <p class="ds-small ds-muted brk">{{ form.description||t('Hizmetini açık ve doğru bilgilerle anlat.') }}</p>
              <div class="ds-row ds-g6 ds-wrap"><span class="ds-chip">{{ categoryName }}</span></div>
              <div class="ds-divider"></div>
              <div class="ds-row ds-sb ds-g8">
                <span class="ds-row ds-g8 ds-small ds-passive" aria-disabled="true" :title="t('Yakında')"><span class="ds-check" aria-hidden="true"></span>{{ t('Karşılaştır') }}</span>
                <span class="ds-small ds-b ds-passive" aria-disabled="true" :title="t('Yakında')">{{ t('Detayları gör') }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="ds-card ds-pad24 ds-col ds-g8">
          <h3>{{ t('Özet') }}</h3>
          <div class="kv"><span class="ds-muted">{{ t('Paket') }}</span><strong>{{ t(packName) }}</strong></div>
          <div class="kv"><span class="ds-muted">{{ t('Dönem') }}</span><strong>{{ form.startDate }} · {{ form.days }} {{ t('gün') }}</strong></div>
          <div class="kv"><span class="ds-muted">{{ t('İl') }}</span><strong>{{ form.city }}</strong></div>
          <div class="kv"><span class="ds-muted">{{ t('Tarife') }}</span><strong>{{ t('Sunucuda hesaplanır') }}</strong></div>
          <div class="kv"><span class="ds-muted">{{ t('KDV dahil tutar') }}</span><strong>{{ t('Fiyat kontrolünde gösterilir') }}</strong></div>
          <div class="ds-col ds-g8 acts">
            <button v-if="editable" :class="['ds-btn','w',!admin&&!demo&&value.version>0&&value.status==='draft'?'s':'p']" :disabled="busy" @click="send('save')">{{ t(demo?'Örnek kampanyayı kontrol et':'Taslağı kaydet') }}</button>
            <button v-if="!admin&&!demo&&value.version>0&&value.status==='draft'" class="ds-btn p lg w" :disabled="busy||dirty" @click="send('submit')">{{ t('Moderasyona gönder') }}</button>
            <template v-if="admin&&value.status==='pending'">
              <button class="ds-btn p w" :disabled="busy||reason.trim().length<10" @click="send('approve')">{{ t('Onayla') }}</button>
              <button class="ds-btn d w" :disabled="busy||reason.trim().length<10" @click="send('reject')">{{ t('Reddet') }}</button>
            </template>
            <button v-if="!admin&&!demo&&value.version>0&&!['cancelled','scheduled'].includes(value.status)" class="ds-btn d w" :disabled="busy" @click="send('cancel')">{{ t('Kampanyayı iptal et') }}</button>
          </div>
          <p v-if="editable&&dirty&&value.version>0" class="ds-xs ds-muted">{{ t('İncelemeye göndermeden önce değişikliklerini kaydet.') }}</p>
          <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
          <p v-if="message" role="status" class="ds-note ok">{{ t(message) }}</p>
        </div>
      </div>
    </div>
    <LiveCampaignBooking v-if="!admin&&!demo&&value.status==='approved'" :campaign="value"/>
    <LiveCampaignMetrics v-if="!admin&&!demo&&value.version>0" :id="value.id"/>
  </article>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.fs{border:0;padding:0;margin:0;min-width:0}
.brk{overflow-wrap:anywhere}
.kv{display:flex;justify-content:space-between;gap:12px;font-size:13px}
.kv strong{text-align:right;overflow-wrap:anywhere}
legend{padding:0}
.lg{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;margin-bottom:20px}
.lb{display:block}
.st{align-self:flex-start}
.w{width:100%}
.acts{padding-top:8px}
ul{list-style:none;margin:0;padding:0}
li{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.5}
li .ds-i{margin-top:3px}
.packs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.pack{display:flex;flex-direction:column;gap:10px;padding:28px;background:#fff;border:1px solid #dfe5eb;border-radius:14px;min-width:0}
.pack.on{border:2px solid #f36b21;padding:27px}
.pack>.ds-badge{align-self:flex-start}
.gap{height:24px}
.pi{width:48px;height:48px;border-radius:14px;background:#fff3ec;color:#c4460b;display:flex;align-items:center;justify-content:center}
.cta{width:100%;margin-top:auto}
.plan{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:start}
.slot{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;padding:12px;border:1px solid #dfe5eb;border-radius:12px}
button.ds-chip{cursor:pointer;font-size:13px}
button.ds-chip:not(.line){border:0}
.ad{border:1px solid #dfe5eb;border-radius:14px;overflow:hidden;background:#fff}
.ad.m{max-width:300px;margin:0 auto;width:100%}
.media{position:relative;height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.tag{position:absolute;left:14px;top:14px}
.heart{position:absolute;right:12px;top:12px;width:36px;height:36px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center}
.nm{font-size:18px;line-height:1.3}
@media(max-width:1100px){.plan{grid-template-columns:minmax(0,1fr)}.packs{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
@media(max-width:760px){.pack{padding:20px}.pack.on{padding:19px}.packs{gap:12px}}
@media(max-width:480px){.packs{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
