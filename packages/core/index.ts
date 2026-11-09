import englishLabels from './locales/en.json';
import {z} from 'zod';
import {coveredCities} from './coverage';
export const cities=coveredCities;
export const categories=[
 {id:'mechanical',name:'Mekanik Servis',services:['Periyodik bakım','Motor bakımı','Şanzıman','Fren','Süspansiyon','Debriyaj','Turbo','Enjektör']},
 {id:'detailing',name:'Oto Kuaför',services:['Detaylı temizlik','İç temizlik','Dış yıkama','Pasta cila','Koltuk temizliği']},
 {id:'body',name:'Kaporta & Boya',services:['Kaporta','Boya','Boyasız göçük','Tampon onarımı']},
 {id:'tyres',name:'Lastik & Jant',services:['Lastik','Rot balans','Jant onarımı','Lastik oteli']},
 {id:'motorcycle',name:'Motosiklet',services:['Motosiklet bakım','Scooter','Motosiklet elektrik']},
 {id:'electrical',name:'Elektrik & Elektronik',services:['Oto elektrik','Akü','Arıza tespiti','Marş','Alternatör']},
 {id:'glass',name:'Cam & Sunroof',services:['Oto cam','Cam tamiri','Sunroof','Panoramik tavan']},
 {id:'protection',name:'Film & Kaplama',services:['Cam filmi','PPF','Seramik kaplama','Renk kaplama']},
 {id:'climate',name:'Klima',services:['Klima bakımı','Gaz dolumu','Kalorifer']},
 {id:'electric-vehicle',name:'Elektrikli & Hibrit',services:['Elektrikli araç','Hibrit bakım','Batarya teşhisi']},
 {id:'accessories',name:'Döşeme & Aksesuar',services:['Döşeme','Deri tamiri','Aksesuar']},
 {id:'assistance',name:'Yol Yardım & Destek',services:['Yol yardım','Çekici','Muayene hazırlığı']},
 {id:'auto-expertise',name:'Oto Ekspertiz',services:['Oto ekspertiz','Kaporta boya kontrolü','Motor mekanik kontrol','Airbag kontrolü','Kilometre / hasar kontrolü','Elektrikli araç batarya testi']},
 {id:'exhaust',name:'Egzoz',services:['Egzoz tamiri','Egzoz montajı','Partikül filtresi temizliği','Katalizör']},
 {id:'turbo',name:'Turbo',services:['Turbo tamiri','Turbo revizyonu','Turbo bakımı']},
 {id:'suspension',name:'Süspansiyon & Amortisör',services:['Süspansiyon','Amortisör tamiri','Ön takım','Havalı süspansiyon']},
 {id:'transmission',name:'Şanzıman',services:['Şanzıman','Otomatik şanzıman','DSG','Manuel şanzıman','Şanzıman yağı değişimi']},
 {id:'car-audio',name:'Multimedya & Ses',services:['Oto multimedya','Oto ses sistemi','CarPlay / Android Auto','Hoparlör montajı','Geri görüş kamerası']},
 {id:'tuning',name:'Modifiye & Performans',services:['Chip tuning','Performans tuning','Performans egzoz','Intercooler','Dinamometre']},
 {id:'facelift',name:'Facelift & Özel Proje',services:['Facelift','Body kit','Özel proje','Araç dönüşümü']}
];
export const brands=['BMW','Mercedes-Benz','Volkswagen','Audi','Toyota','Honda','Renault','Fiat','Ford','Peugeot','Citroën','Opel','Hyundai','Kia','Nissan','Volvo','Tesla','Togg','BYD','Yamaha','Suzuki'];
export type Business={id:string;name:string;city:string;district:string;address:string;categories:string[];services:string[];brands:string[];phone?:string;contactEmail?:string;website?:string;latitude?:number;longitude?:number;coordinateStatus:'verified'|'unverified';ownership:'unclaimed'|'pending'|'verified';features:{quotes:boolean;appointments:boolean};ownerReady:boolean;published:boolean;sample?:boolean;coverPhotoId?:string;image?:string;cardPayment?:boolean;wc?:boolean;hours?:string;distance?:number};
export const sampleBusinesses:Business[]=[
 {id:'sample-motor',name:'Örnek Motor Atölyesi',city:'İstanbul',district:'Ümraniye',address:'Örnek Sanayi Sitesi · Tasarım kaydı',categories:['mechanical','electrical'],services:['Periyodik bakım','Motor bakımı','Arıza tespiti'],brands:['BMW','Mercedes-Benz'],cardPayment:true,wc:true},
 {id:'sample-detail',name:'Örnek Detay Garajı',city:'İstanbul',district:'Kadıköy',address:'Örnek bakım noktası · Tasarım kaydı',categories:['detailing','protection'],services:['İç temizlik','Pasta cila','Seramik kaplama'],brands:[],cardPayment:true},
 {id:'sample-care',name:'Örnek Oto Bakım',city:'İstanbul',district:'Başakşehir',address:'Örnek atölye · Tasarım kaydı',categories:['mechanical','tyres'],services:['Periyodik bakım','Rot balans','Lastik'],brands:['Volkswagen','Audi']},
 {id:'sample-body',name:'Örnek Göçük Merkezi',city:'İstanbul',district:'Kartal',address:'Örnek kaporta atölyesi · Tasarım kaydı',categories:['body','glass'],services:['Boyasız göçük','Kaporta','Oto cam'],brands:[]},
 {id:'sample-ankara',name:'Örnek Başkent Servis',city:'Ankara',district:'Yenimahalle',address:'Örnek servis · Tasarım kaydı',categories:['mechanical'],services:['Fren','Şanzıman'],brands:['Renault','Fiat']},
 {id:'sample-izmir',name:'Örnek Ege Moto',city:'İzmir',district:'Bornova',address:'Örnek motosiklet servisi · Tasarım kaydı',categories:['motorcycle'],services:['Motosiklet bakım','Scooter'],brands:['Honda','Yamaha']},
 {id:'sample-expertise',name:'Örnek Oto Ekspertiz Merkezi',city:'İstanbul',district:'Kadıköy',address:'Örnek ekspertiz noktası · Tasarım kaydı',categories:['auto-expertise'],services:['Oto ekspertiz','Kaporta boya kontrolü','Motor mekanik kontrol'],brands:[]}
].map(b=>({...b,ownership:'unclaimed',coordinateStatus:'unverified',features:{quotes:false,appointments:false},ownerReady:false,published:true,sample:true,image:b.id==='sample-motor'?'/workshop.png':undefined} as Business));
export const normalize=(s:string)=>s.toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const aliases:Record<string,string>={egsoz:'egzoz',eksoz:'egzoz',egzozcu:'egzoz',sanzuman:'sanziman',sanzimanci:'sanziman',amortisorcu:'amortisor',turbocu:'turbo',multimedia:'multimedya',muzik:'ses',music:'ses',elektirik:'elektrik',balanc:'balans',kuafor:'detay',yikama:'temizlik',usta:'',ustasi:'',servisi:'',servis:'',icin:'',bir:'',oto:'',otomobil:'',arabam:'',mercedes:'mercedes',gocuk:'gocuk'};
const englishSearchLabels:Record<string,string>=Object.fromEntries(categories.flatMap(c=>[c.name,...c.services]).map(label=>[normalize((englishLabels as Record<string,string>)[label]??label),normalize(label)]));
Object.assign(englishSearchLabels,{'car wash':'yikama','dent repair':'gocuk','wheel alignment':'rot balans','oil change':'periyodik bakim','car detailing':'oto kuafor','garage':'servis','tire':'lastik','tires':'lastik','tyre':'lastik','brake':'fren','engine':'motor'});
Object.assign(englishSearchLabels,{'pre purchase inspection':'oto ekspertiz','prepurchase inspection':'oto ekspertiz','vehicle appraisal':'oto ekspertiz','auto expertise':'oto ekspertiz','exhaust':'egzoz','gearbox':'sanziman','transmission':'sanziman','shock absorber':'amortisor','suspension':'suspansiyon','car audio':'oto ses sistemi','chiptuning':'chip tuning','bodykit':'body kit'});
const englishSearchPattern=new RegExp('\\b(?:'+Object.keys(englishSearchLabels).sort((a,b)=>b.length-a.length).join('|')+')\\b','g');
export function queryTerms(q:string,english=true){const normalized=normalize(q);return (english?normalized.replace(englishSearchPattern,word=>englishSearchLabels[word]):normalized).split(' ').map(t=>aliases[t]??t).filter(Boolean);}
export function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const rad=Math.PI/180;const x=Math.sin((b.latitude-a.latitude)*rad/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin((b.longitude-a.longitude)*rad/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export function searchBusinesses(data:Business[],filter:{q?:string;city?:string;district?:string;category?:string;service?:string;brand?:string;card?:boolean;center?:{latitude:number;longitude:number};radius?:number}){
 if(filter.service&&!categories.find(c=>c.id===filter.category)?.services.some(s=>normalize(s)===normalize(filter.service!)))return [];
 const terms=queryTerms(filter.q??'');return data.filter(b=>b.published&&(!filter.city||b.city===filter.city)&&(!filter.district||(!!filter.city&&normalize(b.district)===normalize(filter.district)))&&(!filter.category||b.categories.includes(filter.category))&&(!filter.service||b.services.some(s=>normalize(s)===normalize(filter.service!)))&&(!filter.brand||b.brands.includes(filter.brand))&&(!filter.card||b.cardPayment===true)).map(b=>({...b,distance:filter.center&&b.coordinateStatus==='verified'&&b.latitude!==undefined&&b.longitude!==undefined?distanceKm(filter.center,{latitude:b.latitude,longitude:b.longitude}):undefined})).filter(b=>{
 const hay=queryTerms([b.name,b.city,b.district,...b.services,...b.brands,...b.categories.map(c=>categories.find(x=>x.id===c)?.name??'')].join(' '),false);
 return terms.every(t=>hay.some(h=>h.includes(t)))&&(!filter.center||(b.distance!==undefined&&b.distance<=(filter.radius??25)));
 }).sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity)||a.name.localeCompare(b.name,'tr'));
}
export function featureAvailable(b:Business,kind:'quotes'|'appointments'){return b.published&&b.ownership==='verified'&&b.ownerReady&&b.features[kind];}
export const vehicleSchema=z.object({brand:z.string().trim().min(1).max(50),model:z.string().trim().min(1).max(80),year:z.coerce.number().int().min(1950).max(new Date().getFullYear()+1),fuel:z.enum(['Benzin','Dizel','Hibrit','Elektrikli','LPG']),mileage:z.coerce.number().int().min(0).max(2000000),inspectionDueDate:z.iso.date().optional(),photoId:z.string().uuid().optional()}).strict();
export type Vehicle=z.infer<typeof vehicleSchema>&{id:string;archived?:boolean};
export const maintenanceSchema=z.object({vehicleId:z.string().min(1),title:z.string().trim().min(2).max(120),date:z.iso.date(),mileage:z.coerce.number().int().min(0).max(2000000),amount:z.coerce.number().min(0).max(10000000),note:z.string().trim().max(1000).default(''),attachmentIds:z.array(z.string().uuid()).max(3).optional()}).strict().refine(v=>v.date<=new Date().toISOString().slice(0,10),'Gelecekteki bir işlem bakım geçmişine kaydedilemez.');
export type Maintenance=z.infer<typeof maintenanceSchema>&{id:string};
export const reminderSchema=z.object({vehicleId:z.string().min(1),title:z.string().trim().min(2).max(100),completed:z.boolean().optional(),dueDate:z.iso.date().optional(),dueKm:z.coerce.number().int().min(0).optional(),channels:z.array(z.enum(['push','email'])).max(2).optional(),advanceDays:z.coerce.number().int().refine(n=>[0,1,3,7].includes(n)).optional()}).strict().refine(v=>v.dueDate||v.dueKm!==undefined,'Tarih veya kilometre belirtin.');
export type Reminder=z.infer<typeof reminderSchema>&{id:string};
export function reminderStatus(r:Reminder,vehicle:Vehicle,today:string){const km=r.dueKm!==undefined? r.dueKm-vehicle.mileage:undefined;const overdue=!r.completed&&Boolean((r.dueDate&&r.dueDate<=today)||(km!==undefined&&km<=0));return {overdue,remainingKm:km};}
export const reviewSchema=z.object({businessId:z.string().min(1),rating:z.coerce.number().int().min(1).max(5),quality:z.coerce.number().int().min(1).max(5).optional(),payment:z.coerce.number().int().min(1).max(5).optional(),cleanliness:z.coerce.number().int().min(1).max(5).optional(),resolved:z.enum(['yes','partial','no','unknown']),wc:z.enum(['yes','no','unknown']),wcCleanliness:z.coerce.number().int().min(1).max(5).optional(),text:z.string().trim().min(10).max(3000)}).strict().refine(v=>v.wc==='yes'||v.wcCleanliness===undefined,'WC temizliği sadece WC kullanımı belirtildiğinde puanlanabilir.');
export const claimSchema=z.object({businessId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(),name:z.string().trim().min(2).max(160),city:z.string().refine(s=>cities.includes(s)),address:z.string().trim().min(10).max(500),contactName:z.string().trim().min(2).max(100),phone:z.string().regex(/^\+?[\d\s()\-]{10,20}$/),note:z.string().trim().max(2000)}).strict();
export const requestSchema=z.object({businessId:z.string().min(1),kind:z.enum(['quotes','appointments']),service:z.string().trim().min(2).max(120),vehicle:z.string().trim().min(2).max(120),message:z.string().trim().min(10).max(2000),preferredDate:z.iso.date().optional()}).strict();
export type Role='consumer'|'owner'|'staff'|'moderator'|'finance'|'admin';
export function mayManageBusiness(actor:{role:Role;businessIds:string[]},businessId:string){return actor.role==='admin'||(['owner','staff'].includes(actor.role)&&actor.businessIds.includes(businessId));}
export const tokens={navy:'#10243A',orange:'#C4460B',accent:'#F36B21',surface:'#FFFFFF',background:'#F4F6F8',muted:'#586879',border:'#DFE5EB',radius:12};

