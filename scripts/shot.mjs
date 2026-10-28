// Screenshots of the web build through the Chrome DevTools protocol, in real time (no virtual time budget, so a
// request that never settles, like Firebase retrying, cannot stall it). Also prints the page's console errors.
//
//   node scripts/shot.mjs <out.png> <WxH> <url> [waitMs] [scale]
// The url may also come from SHOT_URL (a Windows node shim can split an argument at '&').
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, size, urlArg, waitArg, scaleArg] = process.argv.slice(2);
const url = process.env.SHOT_URL || urlArg;
const [w, h] = size.split('x').map(Number);
const wait = Number(waitArg ?? 12000);
const scale = Number(scaleArg ?? 1);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'chrome-cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    target = list.find(t => t.type === 'page');
  } catch {}
}
if (!target) throw new Error('chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (process.env.SHOT_DEBUG && msg.method === 'Network.requestWillBeSent') {
    console.log('REQ', msg.params.requestId, msg.params.request.url.slice(0, 110));
  } else if (process.env.SHOT_DEBUG && (msg.method === 'Network.loadingFinished' || msg.method === 'Network.loadingFailed')) {
    console.log(msg.method === 'Network.loadingFailed' ? 'FAIL' : 'DONE', msg.params.requestId, msg.params.errorText ?? msg.params.encodedDataLength);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description?.slice(0, 600) ?? msg.params.exceptionDetails.text);
  } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
    console.log(msg.params.type.toUpperCase(), msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400));
  }
});
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Runtime.enable');
await send('Page.enable');
if (process.env.SHOT_DEBUG) await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
await send('Page.navigate', { url });
await sleep(wait);
const probe = await send('Runtime.evaluate', { expression: `JSON.stringify({ ready: document.readyState, root: document.getElementById('root')?.innerHTML.length ?? -1, scripts: [...document.scripts].map(s => s.src.slice(0, 60)) })`, returnByValue: true });
if (process.env.SHOT_DEBUG) console.log('PAGE', probe.result?.result?.value);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(out);
ws.close();
chrome.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
