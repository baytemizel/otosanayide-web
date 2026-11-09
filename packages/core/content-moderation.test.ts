import test from 'node:test';import assert from 'node:assert/strict';
import {inspectLanguage,normalizeModerationText,checkAiModeration,mayApplyAiResult} from './content-moderation';
test('TR/EN catch every requested symbol and ordered pair between letters',()=>{
 const symbols=['.','*','?','\\','/','+','^',"'",'!','&','(',')','='];
 const separators=[...symbols,...symbols.flatMap(a=>symbols.map(b=>a+b))];
 for(const [word,group] of [['siktir','tr-profanity'],['piç','tr-profanity'],['fuck','en-profanity'],['shit','en-profanity']]){
  for(const separator of separators){
   const samples=[Array.from(word).join(separator),...Array.from({length:word.length-1},(_,i)=>word.slice(0,i+1)+separator+word.slice(i+1))];
   for(const sample of samples){const result=inspectLanguage(`TEST: ${sample}.`);assert.ok(result.signals.includes(group),JSON.stringify({word,separator,sample,result}));}
  }
 }
});
test('mixed separators and benign TR/EN punctuation preserve moderation boundaries',()=>{
 for(const text of ["s*!i?/k\\+t^'i!&r",'f()u==c/*k'])assert.equal(inspectLanguage(text).flagged,true,text);
 for(const text of ["Bakım (yağ + filtre) = tamam! Cam/kaporta? A**B, C\\D & E.","Service (oil + filter) = done! Glass/bodywork? A**B, C\\D & E.","Klasik araç: s**i? Test sonucu iyi.","Classic car: f**u? Test result fine."])assert.equal(inspectLanguage(text).flagged,false,text);
});
test('TR/EN profanity catches separators, homoglyphs, zero-width and leetspeak',()=>{for(const text of ['s.i.k.t.i.r','S İ K T İ R','s💥i💥k💥t💥i💥r','s\u200bi\u200bk\u200btir','s1kt1r','ＳＩＫＴＩＲ','sіktіr','f.u.c.k','f@u@c@k','f$u$c$k','FUUUUCK','sh1t','4mk','p.i.ç'])assert.equal(inspectLanguage(text).flagged,true,text);});
test('innocent words and negative service feedback do not trigger substring matches',()=>{for(const text of ['Cam filmi ve klasik araç bakımı','Sık sık aradım; sorun çözülmedi. Çok pahalıydı.','Classic car assistance and sheet metal','Scunthorpe service was disappointing','Dikdörtgen cam','İşçilik kötü, ödeme zor.'])assert.equal(inspectLanguage(text).flagged,false,text);});
test('comparison normalization never mutates original content and custom rules are bounded',()=>{const text='S\u200bİKTİR';assert.notEqual(normalizeModerationText(text),text);assert.equal(text,'S\u200bİKTİR');assert.equal(inspectLanguage('spamword',['spamword']).flagged,true);assert.equal(inspectLanguage('normal',['.*']).flagged,false);});
test('AI disabled, failures and malformed responses are unavailable, never clean',async()=>{let called=false;const fetcher=(async()=>{called=true;throw Error('secret');}) as typeof fetch;assert.deepEqual(await checkAiModeration('test',{enabled:false,apiKey:'TEST',fetcher}),{status:'unavailable'});assert.equal(called,false);assert.deepEqual(await checkAiModeration('test',{enabled:true,apiKey:'TEST',fetcher}),{status:'unavailable'});const malformed=(async()=>new Response(JSON.stringify({results:[{flagged:false}]}))) as typeof fetch;assert.deepEqual(await checkAiModeration('test',{enabled:true,apiKey:'TEST',fetcher:malformed}),{status:'unavailable'});});
test('AI evaluates original and comparison copies without identity data and merges flags',async()=>{let payload:any;const fetcher=(async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/moderations');payload=JSON.parse(String(init?.body));return new Response(JSON.stringify({model:'test-model',results:[{flagged:false,categories:{harassment:false}},{flagged:true,categories:{harassment:true}}]}));}) as typeof fetch;const result=await checkAiModeration('s.i.k.t.i.r',{enabled:true,apiKey:'TEST',fetcher});assert.equal(payload.input.length,2);assert.deepEqual(Object.keys(payload).sort(),['input','model']);assert.deepEqual(result,{status:'checked',model:'test-model',flagged:true,categories:['harassment']});});
test('AI result cannot attach to edited, reviewed or replaced work',()=>{const expected={version:2,text:'review',runId:'run'},current={status:'pending',version:2,text:'review',aiRunId:'run'};assert.equal(mayApplyAiResult(current,expected),true);for(const change of [{version:3},{text:'edited'},{status:'approved'},{aiRunId:'other'}])assert.equal(mayApplyAiResult({...current,...change},expected),false);});
