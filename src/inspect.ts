// The inspector's selector: details for the function or target named by the route.

import { bytes, hex, number, percent } from "./model/format.ts";
import { findFunction, neighbours, sourceUrl } from "./model/index.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { codeCounts } from "./model/status.ts";
import { codeMeter } from "./selectors.ts";
import { INSPECT, SDK, SITE, SUMMARY, TIER_LABEL } from "./strings.ts";
import type { Code, Fn, Model, Target } from "./types.ts";
import type { Ctx, Part, Views } from "./viewtypes.ts";

const F = INSPECT.fields;
type Inspector = NonNullable<Views["inspector"]>;
type Field = Inspector["fields"][number];

const field = (label: string, ...value: Part[]): Field => ({ label, value });
const text = (value: string, extra: Partial<Part> = {}): Part => ({ text: value, ...extra });

function functionBody(model: Model, fn: Fn): Pick<Inspector, "fields" | "buttons" | "lists"> {
  const target = model.targetById.get(fn.target)!;
  const { previous, next } = neighbours(model, fn);
  const around = (other: Fn | null): Part[] =>
    other ? [text(other.name, { to: { view: { kind: "fn", id: other.id } } }), text(` ${other.addr || ""}`, { code: true, mute: !other.addr })] : [text("-")];
  const fields: Field[] = [
    field(F.address, fn.addr ? text(fn.addr, { code: true }) : text("-", { mute: true })),
    field(F.size, text(bytes(fn.bytes))),
    field(F.status, text("", { status: fn.status })),
    field(F.part, text(INSPECT.parts[fn.kind])),
    field(F.target, text(target.name, { to: { view: { kind: "target", id: target.id } } }), text(` ${target.id}`, { code: true, mute: true })),
    field(F.group, text(target.groupLabel)),
  ];
  if (fn.address !== null) fields.splice(1, 0, field(F.ends, text(hex(fn.address + fn.bytes), { code: true })));
  if (fn.kind === "sdk") {
    fields.push(field(F.library, text(fn.library === ASSEMBLY_LIBRARY ? SDK.assemblyLibrary : (fn.library ?? "-"))));
    fields.push(field(F.tier, text(fn.tier ? TIER_LABEL[fn.tier] : "-")));
    if (fn.version) fields.push(field(F.version, text(fn.version)));
    fields.push(field(F.score, text(`${fn.fuzzy.toFixed(1)}%`)));
  }
  if (fn.source) {
    fields.push(
      fn.source.endsWith(".c")
        ? field(F.source, text(fn.source, { url: sourceUrl(model.meta.commit, fn.source), code: true }), text(INSPECT.sourceNote, { small: true }))
        : field(F.source, text(fn.source, { code: true, mute: true }), text(INSPECT.objectNote, { small: true })),
    );
  } else {
    fields.push(field(F.source, text(fn.kind === "sdk" ? (fn.tier === "assembly" ? INSPECT.noSourceAssembly : INSPECT.noSourceSdk) : INSPECT.noSource, { mute: true })));
  }
  fields.push({ label: F.previous, value: around(previous) }, { label: F.next, value: around(next) });
  return { fields, lists: [], buttons: [] };
}

const codeStatuses = (code: Code): Inspector["statuses"] => codeCounts(code).map(([status, count]) => ({ status, count: number(count) }));

function targetBody(model: Model, target: Target): Pick<Inspector, "fields" | "buttons" | "lists" | "meter" | "statuses"> {
  const { code, data } = target;
  return {
    meter: codeMeter(code, target.name),
    statuses: codeStatuses(code),
    fields: [
      field(F.target, text(target.id, { code: true })),
      field(F.group, text(target.groupLabel)),
      field(F.payload, text(bytes(target.size))),
      field(F.functions, text(INSPECT.functions(code.exact, code.functions, percent(code.exact, code.functions, 1)))),
      field(F.bytes, text(SUMMARY.ofBytes(code.exactBytes, code.bytes))),
      field(F.data, text(data ? `${percent(data.typed, data.bytes, 1)}% · ${SUMMARY.ofBytes(data.typed, data.bytes)}` : "-")),
      field(F.source, text(`src/${target.id}`, { url: `${SITE.repoUrl}/tree/${model.meta.commit}/src/${target.id}`, code: true })),
    ],
    lists: [],
    buttons: [
      { label: INSPECT.showOnMap, to: { view: { kind: "image", id: target.id } } },
      { label: INSPECT.browseTarget, to: { target: target.id, group: null, part: "all", lib: null }, scroll: "browse" },
    ],
  };
}


export function inspector({ model, route }: Ctx): Views["inspector"] {
  const view = route.view;
  if (view.kind === "home" || view.kind === "image" || view.kind === "part") return null;
  const empty = { fields: [], lists: [], buttons: [] };
  if (view.kind === "fn") {
    const fn = findFunction(model, view.id);
    const base = { view: "fn", kind: INSPECT.function };
    return fn
      ? { ...base, title: fn.name, ...functionBody(model, fn) }
      : { ...base, title: view.id, ...empty, message: INSPECT.notFound };
  }
  const target = model.targetById.get(view.id);
  const base = { view: "target", kind: INSPECT.target };
  return target ? { ...base, title: target.name, ...targetBody(model, target) } : { ...base, title: view.id, ...empty, message: INSPECT.notFound };
}
