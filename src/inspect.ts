// The side panel's selector: the details of the function the route opens.

import { bytes, hex } from "./model/format.ts";
import { findFunction, neighbours } from "./model/index.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { INSPECT, SDK } from "./strings.ts";
import type { Fn, Model } from "./types.ts";
import type { Ctx, Part, Views } from "./viewtypes.ts";

const F = INSPECT.fields;
type Inspector = NonNullable<Views["inspector"]>;
type Field = Inspector["fields"][number];

const field = (label: string, ...value: Part[]): Field => ({ label, value });
const text = (value: string, extra: Partial<Part> = {}): Part => ({ text: value, ...extra });

function functionFields(model: Model, fn: Fn): Field[] {
  const target = model.targetById.get(fn.target)!;
  const { previous, next } = neighbours(model, fn);
  const around = (other: Fn | null): Part[] =>
    other ? [text(other.name, { to: { fn: other.id } }), text(` ${other.addr}`, { code: true, mute: true })] : [text("-", { mute: true })];
  const fields: Field[] = [
    field(F.address, fn.addr ? text(fn.addr, { code: true }) : text("-", { mute: true })),
    field(F.size, text(bytes(fn.bytes))),
    field(F.status, text("", { status: fn.status })),
  ];
  if (fn.address !== null) fields.splice(1, 0, field(F.ends, text(hex(fn.address + fn.bytes), { code: true })));
  if (fn.fuzzyReported) fields.push(field(F.fuzzy, text(`${fn.fuzzy.toFixed(1)}%`)));
  fields.push(field(F.code, text(INSPECT.code[fn.kind])));
  if (fn.kind === "sdk") {
    fields.push(field(F.library, text(fn.library === ASSEMBLY_LIBRARY ? SDK.assemblyLibrary : (fn.library ?? "-"))));
    if (fn.version) fields.push(field(F.version, text(fn.version)));
  }
  fields.push(
    field(F.image, text(target.name, { to: { view: { kind: "image", id: target.id } } })),
    field(F.group, text(target.groupLabel, { to: { view: { kind: "part", key: target.group } } })),
  );
  if (fn.source?.endsWith(".c")) fields.push(field(F.source, text(fn.source, { code: true })));
  else if (fn.source) fields.push(field(F.source, text(fn.source, { code: true, mute: true })));
  else fields.push(field(F.source, text(fn.kind === "sdk" ? (fn.tier === "assembly" ? INSPECT.noSourceAssembly : INSPECT.noSourceSdk) : INSPECT.noSource, { mute: true })));
  fields.push(field(F.previous, ...around(previous)), field(F.next, ...around(next)));
  return fields;
}

export function inspector({ model, route }: Ctx): Views["inspector"] {
  if (!route.fn) return null;
  const fn = findFunction(model, route.fn);
  return fn ? { title: fn.name, fields: functionFields(model, fn) } : { title: route.fn, fields: [], message: INSPECT.notFound };
}
