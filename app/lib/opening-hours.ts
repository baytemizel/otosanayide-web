import {z} from 'zod';

/** Proposed structured hours (endpoint request web-07). Absent means "unknown", never "open". */
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
/** web-07: an interval stays inside one day; `close` may be 24:00. */
const interval = z.object({open: hhmm, close: z.union([hhmm, z.literal('24:00')])}).strict().refine(v => v.close > v.open);
const intervals = z.array(interval).max(3);
export const openingHoursSchema = z.object({
  timezone: z.literal('Europe/Istanbul'),
  week: z.array(z.object({day: z.number().int().min(1).max(7), intervals}).strict()).max(7)
    .refine(days => new Set(days.map(d => d.day)).size === days.length),
  exceptions: z.array(z.object({date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), intervals}).strict()).max(60).optional(),
  updatedAtMs: z.number().int().nonnegative().optional(),
}).strict();
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export type OpenState = {open: true; until: string} | {open: false; opensAt: string | null};

/** Day (1 = Monday), date and minutes in Europe/Istanbul for the given instant. */
export function istanbulClock(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Istanbul', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})
      .formatToParts(now).map(p => [p.type, p.value]),
  );
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday!) + 1;
  return {day, date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`};
}

function intervalsFor(hours: OpeningHours, day: number, date: string) {
  const exception = hours.exceptions?.find(e => e.date === date);
  if (exception) return exception.intervals;
  return hours.week.find(d => d.day === day)?.intervals ?? [];
}

/** Whether the business is open at `now`, with the closing time or today's next opening. */
export function openState(hours: OpeningHours, now = new Date()): OpenState {
  const clock = istanbulClock(now);
  const today = [...intervalsFor(hours, clock.day, clock.date)].sort((a, b) => a.open.localeCompare(b.open));
  const current = today.find(i => i.open <= clock.time && clock.time < i.close);
  if (current) return {open: true, until: current.close};
  return {open: false, opensAt: today.find(i => i.open > clock.time)?.open ?? null};
}

/** Monday-first rows for display; a day without intervals is shown closed only because the data says so. */
export function weekRows(hours: OpeningHours) {
  return [1, 2, 3, 4, 5, 6, 7].map(day => ({day, intervals: hours.week.find(d => d.day === day)?.intervals ?? []}));
}

/** Weekday name in the page language; 1 Jan 2024 was a Monday. */
export function weekdayName(day: number, localeTag: string) {
  return new Intl.DateTimeFormat(localeTag, {weekday: 'long', timeZone: 'UTC'}).format(new Date(Date.UTC(2024, 0, day)));
}
