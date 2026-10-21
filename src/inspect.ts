// The inspector's selector: everything progress.json knows about the function, target or group
// the route names.

import { hex, number, percent } from "./model/format.ts";
import { findFunction, neighbours, sourcePath, sourceUrl } from "./model/index.ts";
import { STATUS_TABLE } from "./model/status.ts";
import { statusMeter } from "./selectors.ts";
import { INSPECT, SITE, SUMMARY, TIER_LABEL } from "./strings.ts";
import type { Fn, Group, Model, Target } from "./types.ts";
import type { Ctx, Link, Part, Views } from "./viewtypes.ts";

const F = INSPECT.fields;
type Inspector = NonNullable<Views["inspector"]>;
type Field = Inspector["fields"][number];

const field = (label: string, ...value: Part[]): Field => ({ label, value });
const text = (value: string, extra: Partial<Part> = {}): Part => ({ text: value, ...extra });

function functionBody(model: Model, fn: Fn): Pick<Inspector, "fields" | "buttons" | "lists"> {
  const target = model.targetById.get(fn.target)!;
  const path = sourcePath(fn);
  const { previous, next } = neighbours(model, fn);
  const around = (other: Fn | null): Part[] =>
    other ? [text(other.name, { to: { view: { kind: "fn", target: other.target, addr: other.addr } } }), text(` ${other.addr}`, { code: true })] : [text("-")];
  const fields = [
    field(F.address, text(fn.addr, { code: true })),
    field(F.ends, text(hex(fn.address + fn.bytes), { code: true })),
    field(F.size, text(`${number(fn.bytes)} B`)),
    field(F.status, text("", { status: fn.status })),
    field(F.part, text(INSPECT.parts[fn.kind])),
    field(F.target, text(target.name, { to: { view: { kind: "target", id: target.id } } }), text(` ${target.id}`, { code: true, mute: true })),
    field(F.group, text(target.groupLabel)),
  ];
  if (fn.library) {
    fields.push(field(F.library, text(fn.library, { to: { lib: fn.library, part: "sdk", view: { kind: "home" } }, scroll: "browse" })));
    fields.push(field(F.tier, text(fn.tier ? TIER_LABEL[fn.tier] : "-")));
    if (fn.version) fields.push(field(F.version, text(fn.version)));
    if (fn.score !== null && fn.score !== undefined) fields.push(field(F.score, text(`${fn.score}%`)));
  }
  fields.push(
    path
      ? field(F.source, text(path, { url: sourceUrl(model.meta.commit, path), code: true }), text(INSPECT.sourceNote, { small: true }))
      : field(F.source, text(fn.kind === "sdk" ? INSPECT.noSourceSdk : INSPECT.noSource, { mute: true })),
    { label: F.previous, value: around(previous) },
    { label: F.next, value: around(next) },
  );
  return { fields, lists: [], buttons: [] };
}

function targetBody(model: Model, target: Target): Pick<Inspector, "fields" | "buttons" | "lists" | "meter"> {
  const { link, game, all } = target;
  const link_ = link
    ? [
        text(link.status, { pill: link.status === "EXACT" ? "ok" : "bad" }),
        text(
          `${F.payload} ${number(link.payload)} B · ${F.linked} ${number(link.linked)} B · ${F.fromC} ${number(link.from_c)} · ${F.fromAssembly} ${number(link.from_assembly)}` +
            (link.first_mismatch !== null ? ` · ${F.mismatch} ${hex(target.base + link.first_mismatch)}` : ""),
          { small: true },
        ),
      ]
    : [text(INSPECT.notLinked, { mute: true })];
  const { gaps, overlaps, problems } = target.layout;
  const notes = [gaps.length && `${gaps.length} gaps`, overlaps.length && `${overlaps.length} overlaps`, problems.length && `${problems.length} problems`].filter(Boolean);
  return {
    meter: statusMeter(all, target.name),
    fields: [
      field(F.target, text(target.id, { code: true })),
      field(F.group, text(target.groupLabel)),
      field(F.range, text(`${hex(target.base)}-${hex(target.end)}`, { code: true }), text(` · ${number(target.size)} B`)),
      field(
        F.functions,
        text(
          (game.count ? `${number(game.done)} / ${number(game.count)} matched (${percent(game.done, game.count, 1)}%)` : "none") +
            (all.count > game.count ? ` · ${number(all.count - game.count)} PsyQ` : ""),
        ),
      ),
      field(F.bytes, text(`${number(game.bytes)} B`)),
      field(F.data, text(target.data ? `${percent(target.data.typed, target.data.bytes, 1)}% · ${SUMMARY.ofBytes(target.data.typed, target.data.bytes)}` : "-")),
      { label: F.link, value: link_ },
      field(F.audit, text(notes.length ? notes.join(", ") : INSPECT.clean)),
      field(F.counts, text(Object.entries(target.counts).map(([name, value]) => `${name.replace("_", " ")} ${number(value)}`).join(" · "))),
      field(F.source, text(`src/${target.id}`, { url: `${SITE.repoUrl}/tree/${model.meta.commit}/src/${target.id}`, code: true })),
    ],
    lists: [],
    buttons: [
      { label: INSPECT.showOnMap, to: { view: { kind: "target", id: target.id }, map: "tiles" }, scroll: "map" },
      { label: INSPECT.browseTarget, to: { target: target.id, group: null, part: "all", lib: null }, scroll: "browse" },
    ],
  };
}

function groupBody(group: Group): Pick<Inspector, "fields" | "buttons" | "lists" | "meter" | "note" | "statuses"> {
  const items: (Link & { side: string })[] = group.targets.map((target) => ({
    label: target.name,
    to: { view: { kind: "target", id: target.id } },
    side: target.game.count ? `${number(target.game.done)} / ${number(target.game.count)}` : "data only",
  }));
  return {
    note: group.note,
    meter: statusMeter(group, group.label),
    statuses: STATUS_TABLE.filter(({ key }) => group.statuses[key].functions).map(({ key }) => ({ status: key, count: number(group.statuses[key].functions) })),
    fields: [],
    lists: [{ heading: F.targets, items }],
    buttons: [{ label: INSPECT.browseTarget, to: { group: group.key, target: null, lib: null, part: "game" }, scroll: "browse" }],
  };
}

export function inspector({ model, route }: Ctx): Views["inspector"] {
  const view = route.view;
  if (view.kind === "home") return null;
  const empty = { fields: [], lists: [], buttons: [] };
  if (view.kind === "fn") {
    const fn = findFunction(model, view.target, view.addr);
    const base = { view: "fn", kind: INSPECT.function };
    return fn
      ? { ...base, title: fn.name, ...functionBody(model, fn) }
      : { ...base, title: `${view.target}@${view.addr}`, ...empty, message: INSPECT.notFound };
  }
  if (view.kind === "target") {
    const target = model.targetById.get(view.id);
    const base = { view: "target", kind: INSPECT.target };
    return target ? { ...base, title: target.name, ...targetBody(model, target) } : { ...base, title: view.id, ...empty, message: INSPECT.notFound };
  }
  const group = model.groups.find((g) => g.key === view.key);
  const base = { view: "group", kind: INSPECT.group };
  return group ? { ...base, title: group.label, ...groupBody(group) } : { ...base, title: view.key, ...empty, message: INSPECT.notFound };
}
