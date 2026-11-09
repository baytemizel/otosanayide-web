import {z} from 'zod';
import {vehicleSchema,reminderSchema} from './index';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
export const accountUpdateSchema=z.discriminatedUnion('resource',[
 z.object({resource:z.literal('vehicles'),id,value:vehicleSchema,expectedGarageRevision:z.number().int().positive().max(1_000_000_001).optional()}).strict(),
 z.object({resource:z.literal('reminders'),id,value:reminderSchema}).strict()
]);
