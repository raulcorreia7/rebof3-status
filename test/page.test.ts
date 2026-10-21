import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { after, before, test } from "node:test";
import { buildSite } from "../render/build.ts";
import { number, percent } from "../src/model/format.ts";
import { data } from "./fixture.ts";

// Drives a headless Chromium over the DevTools protocol; skipped when none is installed.
const browser = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"].find(
  (name) => spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0,
);
const skip = browser ? false : "no Chromium on PATH";

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

let server: Server;
let chrome: ChildProcess;
let socket: WebSocket;
let base = "";
let nextId = 0;
const waiting = new Map<number, (value: any) => void>();
const problems: string[] = [];

const send = (method: string, params: object = {}): Promise<any> =>
  new Promise((resolve) => {
    const id = ++nextId;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate<T>(expression: string): Promise<T> {
  const reply = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return reply.result.result.value as T;
}

async function open(hash: string, width = 1400, height = 1000) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await send("Page.navigate", { url: `${base}/${hash}` });
  for (let i = 0; i < 100; i++) {
    if (await evaluate<boolean>(`!!document.querySelector("[data-card]")`)) break;
    await sleep(100);
  }
  await sleep(500);
}

before(async () => {
  if (skip) return;
  const dir = mkdtempSync(join(tmpdir(), "status-page-"));
  await buildSite(dir);
  server = createServer((req, res) => {
    const requested = (req.url ?? "/").split(/[?#]/)[0];
    const path = requested === "/" ? "/index.html" : requested;
    try {
      const body = readFileSync(join(dir, path));
      res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const port = 9300 + Math.floor(Math.random() * 600);
  chrome = spawn(browser!, ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, "about:blank"], {
    stdio: "ignore",
  });
  let targets: { type: string; webSocketDebuggerUrl: string }[] = [];
  for (let i = 0; i < 100; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      break;
    } catch {
      await sleep(100);
    }
  }
  socket = new WebSocket(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
  await new Promise((resolve) => (socket.onopen = resolve));
  socket.onmessage = (message) => {
    const body = JSON.parse(String(message.data));
    if (body.id && waiting.has(body.id)) waiting.get(body.id)!(body);
    if (body.method === "Runtime.exceptionThrown") problems.push(String(body.params.exceptionDetails.exception?.description ?? body.params.exceptionDetails.text));
    if (body.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(body.params.type))
      problems.push(body.params.args.map((a: { value?: string; description?: string }) => a.value ?? a.description).join(" "));
  };
  await send("Runtime.enable");
  await send("Page.enable");
});

after(() => {
  socket?.close();
  chrome?.kill();
  server?.close();
});

test("the headline cards equal progress.json", { skip }, async () => {
  await open("");
  const { game, sdk } = data.summary;
  const cards = await evaluate<Record<string, string>>(
    `Object.fromEntries([...document.querySelectorAll("[data-card]")].map((c) => [c.dataset.card, c.textContent]))`,
  );
  assert.ok(cards.game.includes(`${percent(game.done_functions, game.functions, 1)}%`), cards.game);
  assert.ok(cards.game.includes(number(game.done_functions)) && cards.game.includes(number(game.functions)), cards.game);
  assert.ok(cards["game-bytes"].includes(`${percent(game.done_bytes, game.bytes, 1)}%`), cards["game-bytes"]);
  assert.ok(cards.sdk.includes(`${percent(sdk.done_functions, sdk.functions, 1)}%`), cards.sdk);
  assert.ok(cards.sdk.includes(number(sdk.functions)), cards.sdk);
});

test("the page shows no NaN, undefined or the word aid", { skip }, async () => {
  for (const hash of ["", "#target/exe/slus_004_22?map=strips", "#fn/exe/0x8015AD00", "#group/emi/battle"]) {
    await open(hash);
    const text = await evaluate<string>(`document.body.innerText`);
    assert.ok(text.length > 500, `${hash} rendered`);
    assert.doesNotMatch(text, /\bNaN\b|\bundefined\b|\[object|\baids?\b/i, hash);
    const svg = await evaluate<string>(`[...document.querySelectorAll("svg")].map((s) => s.outerHTML).join("")`);
    assert.doesNotMatch(svg, /NaN|undefined/, `${hash} svg`);
  }
});

test("the page has charts, a function table and no script errors", { skip }, async () => {
  await open("");
  for (const id of ["map", "browse"]) {
    await evaluate(`document.getElementById("${id}")?.scrollIntoView()`);
    await sleep(600);
  }
  const found = await evaluate<{ canvases: number; rows: number }>(
    `({ canvases: document.querySelectorAll("canvas").length, rows: document.querySelectorAll("table tbody tr").length })`,
  );
  assert.ok(found.canvases > 0, "charts drew");
  assert.ok(found.rows > 0, "table has rows");
  assert.deepEqual(problems, []);
});

test("a function link opens the inspector and a phone width has no sideways scroll", { skip }, async () => {
  await open("#fn/exe/0x8015AD00");
  const open_ = await evaluate<string>(`document.querySelector("[role=dialog], aside")?.textContent ?? ""`);
  assert.match(open_, /8015AD00/i);
  await open("", 390, 800);
  const wide = await evaluate<boolean>(`document.documentElement.scrollWidth > window.innerWidth + 1`);
  assert.equal(wide, false);
});
