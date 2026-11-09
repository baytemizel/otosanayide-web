import test from 'node:test';
import assert from 'node:assert/strict';
import {claimReviewSchema,decideClaim,matchesVerifiedEvidence} from './claim-review';
const approval=claimReviewSchema.parse({claimId:'claim1',decision:'approve',reason:'İşletme yetkilisi kanıtı incelendi.',evidenceChecked:true,verificationReference:'check1'});
const claim={status:'submitted',userId:'owner1',businessId:'business1'};
test('evidence must be verified and match all three identities',()=>{
 const target={claimId:'claim1',businessId:'business1',userId:'owner1'};
 const proof={...target,status:'verified'};
 assert.equal(matchesVerifiedEvidence(proof,target),true);
 assert.equal(matchesVerifiedEvidence(undefined,target),false);
 for(const change of [{status:'pending'},{claimId:'other'},{businessId:'other'},{userId:'other'}])assert.equal(matchesVerifiedEvidence({...proof,...change},target),false);
});
test('claim approval requires explicit evidence attestation and a reference',()=>{
 assert.equal(claimReviewSchema.safeParse({...approval,evidenceChecked:false}).success,false);
 assert.equal(claimReviewSchema.safeParse({...approval,verificationReference:''}).success,false);
 assert.equal(claimReviewSchema.safeParse({...approval,userId:'other'}).success,false);
 assert.equal(claimReviewSchema.safeParse({...approval,claimId:'../claims'}).success,false);
});
test('reviewer cannot approve or reject own claim',()=>{
 assert.throws(()=>decideClaim(approval,claim,'owner1',{ownership:'unclaimed'}));
 assert.throws(()=>decideClaim({claimId:'claim1',decision:'reject',reason:'Yeterli kanıt sunulmadı.'},claim,'owner1'));
});
test('terminal claim states cannot be overwritten or replayed',()=>{
 for(const status of ['approved','rejected','cancelled','unknown'])assert.throws(()=>decideClaim(approval,{...claim,status},'admin1',{ownership:'unclaimed'}));
});
test('approval refuses missing, sample or already claimed business',()=>{
 assert.throws(()=>decideClaim(approval,claim,'admin1'));
 assert.throws(()=>decideClaim(approval,{...claim,businessId:undefined},'admin1',{ownership:'unclaimed'}));
 for(const business of [{ownership:'verified'},{ownership:'unclaimed',ownerUid:'someone'},{ownership:'unclaimed',sample:true},{}])assert.throws(()=>decideClaim(approval,claim,'admin1',business));
});
test('information request and rejection confer no ownership; eligible claim can be approved',()=>{
 assert.equal(decideClaim({claimId:'claim1',decision:'request_information',reason:'Güncel yetki belgesi gerekli.'},claim,'admin1'),'needs_information');
 assert.equal(decideClaim({claimId:'claim1',decision:'reject',reason:'Sahiplik kanıtlanamadı.'},claim,'admin1'),'rejected');
 assert.equal(decideClaim(approval,{...claim,status:'needs_information'},'admin1',{ownership:'unclaimed'}),'approved');
});
