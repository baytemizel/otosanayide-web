import {reminderSchema} from './index';
export type ReminderDueEvent={phase:'advance'|'due'|'mileage';scheduledAtMs:number};
const day=86400000;
export function reminderDeliveryPlan(value:unknown,mileage:number|undefined,now:number){
 const parsed=reminderSchema.safeParse(value);if(!parsed.success||parsed.data.completed)return {events:[] as ReminderDueEvent[],nextCheckAtMs:null};
 const r=parsed.data,events:ReminderDueEvent[]=[],future:number[]=[];
 if(r.dueDate){const due=Date.parse(`${r.dueDate}T09:00:00+03:00`),advance=due-(r.advanceDays??0)*day;
  if(due<=now)events.push({phase:'due',scheduledAtMs:due});
  else{future.push(due);if(advance<due){if(advance<=now)events.push({phase:'advance',scheduledAtMs:advance});else future.push(advance);}}
 }
 if(r.dueKm!==undefined){if(mileage!==undefined&&mileage>=r.dueKm)events.push({phase:'mileage',scheduledAtMs:now});else future.push(now+day);}
 return {events,nextCheckAtMs:future.length?Math.min(...future):null};
}
// Creation/edit only schedules work; no external channel or delivery is claimed.
export function reminderSchedule(value:unknown,now:number){const parsed=reminderSchema.safeParse(value);if(!parsed.success||parsed.data.completed)return {};const plan=reminderDeliveryPlan(parsed.data,undefined,now);return {nextCheckAtMs:plan.events.length||parsed.data.dueKm!==undefined?now:plan.nextCheckAtMs??now};}
export function reminderInput(row:Record<string,unknown>){return Object.fromEntries(['vehicleId','title','completed','dueDate','dueKm','channels','advanceDays'].filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));}
