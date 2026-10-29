import type { Brief, Contract } from './brief.ts';
export const contract: Contract = {
  start: '2026-10-20T00:00:00Z', end: '2026-10-27T00:00:00Z', maxItems: 10,
  requiredSources: ['https://issues.example.com/project', 'https://releases.example.com/app']
};
export const fixture = (): Brief => ({delivery:'review-only', coverage:[
  {source:contract.requiredSources[0],state:'checked',checkedAt:'2026-10-27T01:00:00Z'},
  {source:contract.requiredSources[1],state:'checked',checkedAt:'2026-10-27T01:00:00Z'}
],items:[{id:'REL-1',kind:'shipped',title:'Example release',source:'https://releases.example.com/app/v1',occurredAt:'2026-10-25T12:00:00Z'}]});
