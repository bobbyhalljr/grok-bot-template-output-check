import { validateBrief } from './brief.ts';
import { contract, fixture } from './fixtures.ts';
const full=fixture(); const partial=fixture();partial.coverage[0]={source:contract.requiredSources[0],state:'unavailable'};
const empty=fixture();empty.items=[];
const overflow=fixture();overflow.items=Array.from({length:contract.maxItems+1},(_,i)=>({...overflow.items[0],id:String(i)}));
for(const [name,brief] of [['reviewable',full],['missing source',partial],['checked empty',empty],['overflow',overflow]] as const)
  console.log(name,JSON.stringify(validateBrief(brief,contract)));
