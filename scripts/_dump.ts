import * as m from '../src/i18n/en';
const e: Record<string, string> = (m as any).en;
const pre = process.argv[2].split(',');
for (const k of Object.keys(e).sort()) if (pre.some(p => k.startsWith(p))) console.log(k + ' = ' + e[k]);
