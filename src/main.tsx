// Entry point: fetch the report, the data census, the game code and asset censuses and the
// committed history, build the model and draw the page.

import { render } from "solid-js/web";
import { buildModel } from "./model/report.ts";
import { SITE } from "./strings.ts";
import "./styles/theme.css";
import "./styles/components.css";
import type { AssetCensus, History, Report, StatusCensus, StatusData } from "./types.ts";
import { App } from "./views/App.tsx";

const host = document.getElementById("page");
// In dev, Vite serves the repository root, so the fixtures are the data; the build copies them
// next to the page.
const dataBase = import.meta.env.DEV ? "test/fixtures/" : "";

async function load(name: string): Promise<unknown> {
  const response = await fetch(name);
  if (!response.ok) throw new Error(`${name}: ${response.status} ${response.statusText}`.trim());
  return response.json();
}

/** A file the publisher added later: an older gh-pages branch does not have it yet. */
const optional = (name: string): Promise<unknown> => load(name).catch(() => null);

async function start(): Promise<void> {
  if (!host) return;
  // Fetch the chart chunk while the data downloads; the charts mount as soon as it is in.
  void import("./charts/canvas.ts");
  try {
    const [report, status, history, census, assets] = await Promise.all([
      load(`${dataBase}report.json`),
      load(`${dataBase}status-data.json`),
      load(`${dataBase}history.json`),
      optional(`${dataBase}status.json`),
      optional(`${dataBase}assets.json`),
    ]);
    const model = buildModel(report as Report, status as StatusData, history as History, { census: census as StatusCensus | null, assets: assets as AssetCensus | null });
    host.replaceChildren();
    render(() => <App model={model} />, host);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    host.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = SITE.loadFailed(message);
    const help = document.createElement("p");
    const reload = document.createElement("a");
    reload.href = "";
    reload.textContent = SITE.loadFailedReload;
    const open = document.createElement("a");
    open.href = `${dataBase}report.json`;
    open.textContent = "report.json";
    help.append(reload, SITE.loadFailedOpen, open, SITE.loadFailedEnd);
    host.append(text, help);
  }
}

void start();
