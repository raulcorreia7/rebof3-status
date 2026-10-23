// Entry point: fetch the report, its data census and the committed history, build the model and
// draw the page.

import { render } from "solid-js/web";
import { buildModel } from "./model/report.ts";
import { SITE } from "./strings.ts";
import "./styles/theme.css";
import "./styles/components.css";
import type { History, Report, StatusData } from "./types.ts";
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

async function start(): Promise<void> {
  if (!host) return;
  // Fetch the chart chunk while the data downloads; the charts mount as soon as it is in.
  void import("./charts/canvas.ts");
  try {
    const [report, status, history] = await Promise.all([load(`${dataBase}report.json`), load(`${dataBase}status-data.json`), load(`${dataBase}history.json`)]);
    const model = buildModel(report as Report, status as StatusData, history as History);
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
