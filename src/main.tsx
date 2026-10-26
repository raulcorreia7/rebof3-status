// Entry point: fetch the published report.json, build the model and draw the page.

import { render } from "solid-js/web";
import { modelFromReport } from "./model/report.ts";
import { SITE } from "./strings.ts";
import "./styles/app.css";
import { App } from "./views/App.tsx";

const host = document.getElementById("page");

async function start(): Promise<void> {
  if (!host) return;
  // Fetch the chart chunk while the report downloads; the charts mount as soon as it is in.
  void import("./charts/canvas.ts");
  try {
    // Vite serves data/report.json in dev and copies it next to the page in the build.
    const response = await fetch("report.json");
    if (!response.ok) throw new Error(`report.json: ${response.status} ${response.statusText}`.trim());
    const model = modelFromReport(await response.json());
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
    open.href = "report.json";
    open.textContent = "report.json";
    help.append(reload, SITE.loadFailedOpen, open, SITE.loadFailedEnd);
    host.append(text, help);
  }
}

void start();
