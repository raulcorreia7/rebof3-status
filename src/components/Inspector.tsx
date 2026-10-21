// The inspector: everything progress.json knows about the function, target or group in the route.

import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { INSPECT, TIER_LABEL, STATUS_LABEL, SITE, SUMMARY } from "../strings.ts";
import { hex, number, percent } from "../model/format.ts";
import { findFunction, neighbours, sourcePath, sourceUrl } from "../model/index.ts";
import { usePage } from "../state.tsx";
import type { Fn, Group, Target } from "../types.ts";
import { scrollToSection } from "./Header.tsx";
import { StatusChip, StatusMeter } from "./ui.tsx";

const F = INSPECT.fields;

const Row = ({ label, children }: { label: string; children: ComponentChildren }) => (
  <>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </>
);

export function Inspector() {
  const { model, route, go } = usePage();
  const view = route.view;
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const open = view.kind !== "home";
  const key = view.kind === "fn" ? `fn:${view.target}@${view.addr}` : view.kind === "target" ? `t:${view.id}` : view.kind === "group" ? `g:${view.key}` : "";
  const [copied, setCopied] = useState(false);

  // Move focus into the panel when it opens and give it back when it closes.
  useEffect(() => {
    if (!open) return;
    opener.current ??= document.activeElement;
    panel.current?.focus({ preventScroll: true });
    return undefined;
  }, [key, open]);
  useEffect(() => {
    if (open) return;
    if (opener.current instanceof HTMLElement) opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && go({ view: { kind: "home" } });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!open) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still holds the link */
    }
  };

  let title = "";
  let kind = "";
  let body: ComponentChildren = null;
  if (view.kind === "fn") {
    const fn = findFunction(model, view.target, view.addr);
    kind = INSPECT.function;
    if (fn) {
      title = fn.name;
      body = <FunctionBody fn={fn} />;
    } else {
      title = `${view.target}@${view.addr}`;
      body = <p>{INSPECT.notFound}</p>;
    }
  } else if (view.kind === "target") {
    const target = model.targetById.get(view.id);
    kind = INSPECT.target;
    title = target?.name ?? view.id;
    body = target ? <TargetBody target={target} /> : <p>{INSPECT.notFound}</p>;
  } else {
    const group = model.groups.find((g) => g.key === view.key);
    kind = INSPECT.group;
    title = group?.label ?? view.key;
    body = group ? <GroupBody group={group} /> : <p>{INSPECT.notFound}</p>;
  }

  return (
    <aside class="inspector" ref={panel} tabIndex={-1} aria-label={`${kind}: ${title}`} data-inspector={view.kind}>
      <div class="inspector-head">
        <div>
          <div class="mute small">{kind}</div>
          <h2>{title}</h2>
        </div>
        <div class="inspector-actions">
          <button type="button" class="ghost" onClick={copy}>
            {copied ? INSPECT.copied : INSPECT.copyLink}
          </button>
          <button type="button" class="ghost" onClick={() => go({ view: { kind: "home" } })} aria-label={INSPECT.close}>
            {INSPECT.close}
          </button>
        </div>
      </div>
      {body}
    </aside>
  );
}

function FunctionBody({ fn }: { fn: Fn }) {
  const { model, href } = usePage();
  const target = model.targetById.get(fn.target)!;
  const path = sourcePath(fn);
  const { previous, next } = neighbours(model, fn);
  const link = (other: Fn | null) =>
    other ? (
      <a href={href({ view: { kind: "fn", target: other.target, addr: other.addr } })}>
        {other.name} <code>{other.addr}</code>
      </a>
    ) : (
      "-"
    );
  return (
    <dl>
      <Row label={F.address}>
        <code>{fn.addr}</code>
      </Row>
      <Row label={F.ends}>
        <code>{hex(fn.address + fn.bytes)}</code>
      </Row>
      <Row label={F.size}>{number(fn.bytes)} B</Row>
      <Row label={F.status}>
        <StatusChip status={fn.status} />
      </Row>
      <Row label={F.part}>{INSPECT.parts[fn.kind]}</Row>
      <Row label={F.target}>
        <a href={href({ view: { kind: "target", id: target.id } })}>{target.name}</a> <code class="mute">{target.id}</code>
      </Row>
      <Row label={F.group}>{target.groupLabel}</Row>
      {fn.library ? (
        <>
          <Row label={F.library}>
            <a href={href({ lib: fn.library, part: "sdk", view: { kind: "home" } })} onClick={() => scrollToSection("browse")}>
              {fn.library}
            </a>
          </Row>
          <Row label={F.tier}>{fn.tier ? TIER_LABEL[fn.tier] : "-"}</Row>
          {fn.version ? <Row label={F.version}>{fn.version}</Row> : null}
          {fn.score !== null && fn.score !== undefined ? <Row label={F.score}>{fn.score}%</Row> : null}
        </>
      ) : null}
      <Row label={F.source}>
        {path ? (
          <>
            <a href={sourceUrl(model.meta.commit, path)} rel="noopener">
              <code>{path}</code>
            </a>
            <div class="mute small">{INSPECT.sourceNote}</div>
          </>
        ) : (
          <span class="mute">{fn.kind === "sdk" ? INSPECT.noSourceSdk : INSPECT.noSource}</span>
        )}
      </Row>
      <Row label={F.previous}>{link(previous)}</Row>
      <Row label={F.next}>{link(next)}</Row>
    </dl>
  );
}

function TargetBody({ target }: { target: Target }) {
  const { model, href } = usePage();
  const link = target.link;
  const notes = [target.layout.gaps.length && `${target.layout.gaps.length} gaps`, target.layout.overlaps.length && `${target.layout.overlaps.length} overlaps`, target.layout.problems.length && `${target.layout.problems.length} problems`].filter(Boolean);
  return (
    <>
      <StatusMeter tally={target.all} label={target.name} />
      <dl>
        <Row label={F.target}>
          <code>{target.id}</code>
        </Row>
        <Row label={F.group}>{target.groupLabel}</Row>
        <Row label={F.range}>
          <code>
            {hex(target.base)}-{hex(target.end)}
          </code>{" "}
          · {number(target.size)} B
        </Row>
        <Row label={F.functions}>
          {target.game.count ? `${number(target.game.done)} / ${number(target.game.count)} matched (${percent(target.game.done, target.game.count, 1)}%)` : "none"}
          {target.all.count > target.game.count ? ` · ${number(target.all.count - target.game.count)} PsyQ` : ""}
        </Row>
        <Row label={F.bytes}>{number(target.game.bytes)} B</Row>
        <Row label={F.data}>{target.data ? `${percent(target.data.typed, target.data.bytes, 1)}% · ${SUMMARY.ofBytes(target.data.typed, target.data.bytes)}` : "-"}</Row>
        <Row label={F.link}>
          {link ? <span class={`pill ${link.status === "EXACT" ? "ok" : "bad"}`}>{link.status}</span> : <span class="mute">{INSPECT.notLinked}</span>}
          {link ? (
            <div class="mute small">
              {F.payload} {number(link.payload)} B · {F.linked} {number(link.linked)} B · {F.fromC} {number(link.from_c)} · {F.fromAssembly} {number(link.from_assembly)}
              {link.first_mismatch !== null ? ` · ${F.mismatch} ${hex(target.base + link.first_mismatch)}` : ""}
            </div>
          ) : null}
        </Row>
        <Row label={F.audit}>{notes.length ? notes.join(", ") : INSPECT.clean}</Row>
        <Row label={F.counts}>
          <span class="small">
            {Object.entries(target.counts)
              .map(([name, value]) => `${name.replace("_", " ")} ${number(value)}`)
              .join(" · ")}
          </span>
        </Row>
        <Row label={F.source}>
          <a href={`${SITE.repoUrl}/tree/${model.meta.commit}/src/${target.id}`} rel="noopener">
            <code>src/{target.id}</code>
          </a>
        </Row>
      </dl>
      <div class="inspector-buttons">
        <a class="button" href={href({ view: { kind: "target", id: target.id }, map: "tiles" })} onClick={() => scrollToSection("map")}>
          {INSPECT.showOnMap}
        </a>
        <a class="button" href={href({ target: target.id, group: null, part: "all", lib: null })} onClick={() => scrollToSection("browse")}>
          {INSPECT.browseTarget}
        </a>
      </div>
    </>
  );
}

function GroupBody({ group }: { group: Group }) {
  const { href } = usePage();
  return (
    <>
      <p class="mute">{group.note}</p>
      <StatusMeter tally={group} label={group.label} />
      <ul class="status-list">
        {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((status) =>
          group.statuses[status].functions ? (
            <li key={status}>
              <StatusChip status={status} /> {number(group.statuses[status].functions)}
            </li>
          ) : null,
        )}
      </ul>
      <h3>{F.targets}</h3>
      <ul class="target-list">
        {group.targets.map((target) => (
          <li key={target.id}>
            <a href={href({ view: { kind: "target", id: target.id } })}>{target.name}</a>
            <span class="mute small">{target.game.count ? `${number(target.game.done)} / ${number(target.game.count)}` : "data only"}</span>
          </li>
        ))}
      </ul>
      <a class="button" href={href({ group: group.key, target: null, lib: null, part: "game" })} onClick={() => scrollToSection("browse")}>
        {INSPECT.browseTarget}
      </a>
    </>
  );
}
