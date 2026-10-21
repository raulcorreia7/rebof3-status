// Entry point: fetch progress.json, build the model and draw the page.

import { render } from "solid-js/web";
import { buildModel } from "./model/index.ts";
import { SITE } from "./strings.ts";
import "./styles/theme.css";
import "./styles/components.css";
import type { ProgressData } from "./types.ts";
import { App } from "./views/App.tsx";

const host = document.getElementById("page");

async function start(): Promise<void> {
  if (!host) return;
  try {
    const response = await fetch("progress.json");
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
    const model = buildModel((await response.json()) as ProgressData);
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
    open.href = "progress.json";
    open.textContent = "progress.json";
    help.append(reload, SITE.loadFailedOpen, open, SITE.loadFailedEnd);
    host.append(text, help);
  }
}

void start();
