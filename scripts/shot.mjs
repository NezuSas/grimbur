// Screenshots of the web build through the Chrome DevTools protocol, in real time (no virtual time budget, so a
// request that never settles, like Firebase retrying, cannot stall it). It shoots once every request to the dev
// server (bundle, images) has finished and the network has been quiet a moment, or at `maxWaitMs` at the latest.
// Also prints the page's console errors. SHOT_CLICKS clicks the page first (see below).
//
//   node scripts/shot.mjs <out.png> <WxH> <url> [maxWaitMs] [scale]
// The url may also come from SHOT_URL (a Windows node shim can split an argument at '&').
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, size, urlArg, waitArg, scaleArg] = process.argv.slice(2);
const url = process.env.SHOT_URL || urlArg;
const [w, h] = size.split('x').map(Number);
const maxWait = Number(waitArg ?? 150000);
// The splash preloads every image in waves with quiet gaps between them: never shoot before it can be over.
const MIN_WAIT = Number(process.env.SHOT_MIN_WAIT ?? 75000);
const scale = Number(scaleArg ?? 1);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'chrome-cdp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Chrome's renderers outlive a killed browser process on Windows: always take the whole tree down, whatever happens.
const killChrome = () => {
  if (process.platform === 'win32') spawnSync('taskkill', ['/T', '/F', '/PID', String(chrome.pid)], { stdio: 'ignore' });
  else chrome.kill('SIGKILL');
};
process.on('exit', killChrome);
setTimeout(() => { console.error('shot.mjs: gave up'); process.exit(1); }, maxWait + 60000).unref();

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
// Requests to the dev server still in flight (third-party long-polls such as Firestore are ignored), and when the last one ended.
const inflight = new Set();
let lastNetwork = Date.now();
const local = u => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(u);
ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.method === 'Network.requestWillBeSent' && local(msg.params.request.url)) {
    inflight.add(msg.params.requestId);
    lastNetwork = Date.now();
  } else if ((msg.method === 'Network.loadingFinished' || msg.method === 'Network.loadingFailed') && inflight.delete(msg.params.requestId)) {
    lastNetwork = Date.now();
  }
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
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: !!process.env.SHOT_MOBILE });
if (process.env.SHOT_MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// SHOT_UA="<user agent>": browse as another browser (an iPhone's Safari, to see what the web build offers there).
if (process.env.SHOT_UA) await send('Emulation.setUserAgentOverride', { userAgent: process.env.SHOT_UA, platform: process.env.SHOT_UA.includes('iPhone') ? 'iPhone' : undefined });
const started = Date.now();
await send('Page.navigate', { url });
const rendered = async () => (await send('Runtime.evaluate', { expression: `(document.getElementById('root')?.innerHTML.length ?? 0) > 2000 && [...document.images].every(i => i.complete)`, returnByValue: true })).result?.result?.value === true;
while (Date.now() - started < maxWait) {
  await sleep(1000);
  if (Date.now() - started > MIN_WAIT && inflight.size === 0 && Date.now() - lastNetwork > 6000 && (await rendered())) break;
}
await sleep(2500); // entrance animations
// SHOT_CLICKS="x,y;x,y": mouse clicks (page pixels) before the shot, 700 ms apart, to check what a tap does.
// A click may be prefixed: "r:x,y" is a right click, "s:x,y" a click with Shift held.
for (const c of (process.env.SHOT_CLICKS ?? '').split(';').filter(Boolean)) {
  const right = c.startsWith('r:');
  const shift = c.startsWith('s:');
  const [x, y] = c.replace(/^[rs]:/, '').split(',').map(Number);
  const button = right ? 'right' : 'left';
  const modifiers = shift ? 8 : 0;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons: right ? 2 : 1, clickCount: 1, modifiers });
  await sleep(80);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1, modifiers });
  await sleep(700);
}
const probe = await send('Runtime.evaluate', { expression: `JSON.stringify({ ready: document.readyState, root: document.getElementById('root')?.innerHTML.length ?? -1, scripts: [...document.scripts].map(s => s.src.slice(0, 60)) })`, returnByValue: true });
if (process.env.SHOT_DEBUG) console.log('PAGE', probe.result?.result?.value);
// SHOT_KEYS="Enter,w,w,d": real key presses (after the clicks), 400 ms apart, to check the keyboard controls.
for (const k of (process.env.SHOT_KEYS ?? '').split(',').filter(Boolean)) {
  const named = { Enter: [13, 'Enter', String.fromCharCode(13)], ArrowUp: [38, 'ArrowUp'], ArrowDown: [40, 'ArrowDown'], ArrowLeft: [37, 'ArrowLeft'], ArrowRight: [39, 'ArrowRight'], Space: [32, ' ', ' '] }[k];
  const [code, key, text] = named ?? [k.toUpperCase().charCodeAt(0), k, k];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code, ...(text ? { text } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
  await sleep(400);
}
// SHOT_EVAL="<js expression>": print what it returns (to inspect the page while debugging a layout).
if (process.env.SHOT_EVAL) {
  const r = await send('Runtime.evaluate', { expression: process.env.SHOT_EVAL, returnByValue: true, awaitPromise: true, userGesture: true });
  if (!process.env.SHOT_FRAMES) await sleep(1500);
  console.log('EVAL', JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text));
}
// SHOT_FRAMES="ms,ms,...": after SHOT_EVAL, a shot at each of these times (ms after it), saved as <out>_f<ms>.png, to see an
// animation in motion (e.g. SHOT_EVAL="window.__replayEncounter()").
if (process.env.SHOT_FRAMES) {
  const t0 = Date.now();
  for (const ms of process.env.SHOT_FRAMES.split(',').map(Number)) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    const f = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(out.replace(/\.png$/, `_f${ms}.png`), Buffer.from(f.result.data, 'base64'));
  }
}
// SHOT_CLIPS=1: list every text the page cuts short (one line with an ellipsis, or clamped to a few lines) or that spills out of its box.
if (process.env.SHOT_CLIPS) {
  const clips = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `JSON.stringify([...document.querySelectorAll('div[dir], span, div')].filter(el => {
      if (!el.textContent.trim() || el.children.length > 0 && [...el.children].some(c => c.tagName === 'DIV')) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.offsetParent === null) return false;
      const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
      const ell = cs.textOverflow === 'ellipsis';
      if (!clamp && !ell) return false;
      // A cut line reports its box's width as scrollWidth: measure the text itself from its font (one-line texts).
      // A cut line still lays out whole: the range over its text is wider than its box (by as little as a fraction).
      if (ell && cs.whiteSpace === 'nowrap') {
        const r = document.createRange(); r.selectNodeContents(el);
        if (r.getBoundingClientRect().width > el.getBoundingClientRect().width * 1.001) return true;
      }
      return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight + 1;
    }).map(el => el.textContent.trim().slice(0, 90)))`,
  });
  for (const t of JSON.parse(clips.result?.result?.value ?? '[]')) console.log('CLIP', t);
}
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(out);
ws.close();
// Browser.close shuts Chrome down with all its helper processes; killing the launcher alone left renderers running.
try {
  const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const browser = new WebSocket(webSocketDebuggerUrl);
  await new Promise(r => browser.addEventListener('open', r, { once: true }));
  browser.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
  await sleep(1500);
} catch {}
killChrome();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
