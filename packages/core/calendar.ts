import {Locale} from './i18n';
import type {Reminder,Vehicle} from './index';
const escape=(value:string)=>value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(line:string){let result='',size=0;for(const c of line){const cp=c.codePointAt(0)!;const bytes=cp<128?1:cp<2048?2:cp<65536?3:4;if(size+bytes>75){result+='\r\n ';size=1;}result+=c;size+=bytes;}return result;}
export function reminderCalendar(r:Reminder,v:Vehicle,now=new Date(),locale:Locale='tr'){
 if(!r.dueDate||!/^\d{4}-\d{2}-\d{2}$/.test(r.dueDate))throw Error('Takvime eklemek için hedef tarih gerekli.');
 const start=new Date(`${r.dueDate}T09:00:00+03:00`);if(!Number.isFinite(start.getTime()))throw Error('Geçersiz tarih.');
 const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const title=`${r.title} · ${v.brand} ${v.model}`;
 const description=locale==='en'?`Otosanayide maintenance reminder.${r.dueKm!==undefined?` Target: ${r.dueKm} km.`:''} This is not a service appointment. Vehicle mileage is not tracked automatically.`:`Otosanayide bakım hatırlatması.${r.dueKm!==undefined?` Hedef: ${r.dueKm} km.`:''} Bu bir servis randevusu değildir. Araç kilometresi otomatik takip edilmez.`;
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Otosanayide//Bakim Hatirlatma//TR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${encodeURIComponent(r.id)}@otosanayide.com`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.getTime()+15*60000))}`,`SUMMARY:${escape(title)}`,`DESCRIPTION:${escape(description)}`,'STATUS:CONFIRMED','TRANSP:TRANSPARENT','BEGIN:VALARM',`TRIGGER:-PT${(r.advanceDays??1)*24}H`,'ACTION:DISPLAY',`DESCRIPTION:${escape(title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'];
 return lines.map(fold).join('\r\n')+'\r\n';
}
