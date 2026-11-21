import {z} from 'zod';
import {vehicleSchema,maintenanceSchema,reminderSchema,garagePlateSchema,garageVinSchema,garageTransmissions,maintenanceTypes,maintenanceDocumentKinds} from './index';
const id=z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const revision=z.number().int().positive().max(1_000_000_001).optional();
// PATCH /api/me v2 fields: absent = the stored value is kept, null = it is cleared (API docs/v2/02-garage.md).
const vehicleUpdate=vehicleSchema.extend({plate:garagePlateSchema.nullable().optional(),transmission:z.enum(garageTransmissions).nullable().optional(),vin:garageVinSchema.nullable().optional()});
const maintenanceUpdate=z.object({...maintenanceSchema.shape,type:z.enum(maintenanceTypes).nullable().optional(),businessId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).nullable().optional(),providerName:z.string().trim().min(1).max(120).nullable().optional(),documentKind:z.enum(maintenanceDocumentKinds).nullable().optional()}).strict().refine(v=>v.date<=new Date().toISOString().slice(0,10),'Gelecekteki bir işlem bakım geçmişine kaydedilemez.');
export const accountUpdateSchema=z.discriminatedUnion('resource',[
 z.object({resource:z.literal('vehicles'),id,value:vehicleUpdate,expectedGarageRevision:revision}).strict(),
 z.object({resource:z.literal('maintenance'),id,value:maintenanceUpdate,expectedGarageRevision:revision}).strict(),
 z.object({resource:z.literal('reminders'),id,value:reminderSchema}).strict()
]);
