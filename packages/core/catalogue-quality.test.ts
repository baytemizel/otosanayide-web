import test from 'node:test';import assert from 'node:assert/strict';
import {qualityEvidenceProjection,qualityFieldLabels,qualityStatusLabels} from './catalogue-quality';
import english from './locales/en.json';
import {translate} from './i18n';
test('quality evidence only exposes known field statuses and safe bounded source links',()=>{
 const p=qualityEvidenceProjection({private:'secret',quality_review:{decision:'K165',checkedAt:'2026-11-04T12:00:00.000Z',internetAttempted:true,googleVerified:true,statuses:{phone:'source-conflict-retained',private:'secret',email:'unrecognized'},sources:['javascript:alert(1)','https://user:secret@example.com','https://example.com/source'],previousValues:{private:'secret'}}})!;
 assert.deepEqual(p.statuses,[{field:'phone',status:'source-conflict-retained'}]);assert.deepEqual(p.sources,['https://example.com/source']);assert.equal(p.googleVerified,false);assert.equal(p.internetAttempted,true);assert.equal(JSON.stringify(p).includes('secret'),false);
});
test('legacy evidence has no fabricated quality review; invalid date remains unknown',()=>{assert.equal(qualityEvidenceProjection({}),null);const p=qualityEvidenceProjection({quality_review:{decision:'K165',checkedAt:'yesterday',internetAttempted:'true'}})!;assert.equal(p.checkedAt,null);assert.equal(p.internetAttempted,false);});

test('every dynamic quality field and source-status label has an English translation',()=>{for(const label of [...Object.values(qualityFieldLabels),...Object.values(qualityStatusLabels)]){assert.ok(Object.hasOwn(english,label),'Missing English quality label: '+label);assert.notEqual(translate('en',label),label);}});
