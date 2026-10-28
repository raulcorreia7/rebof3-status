// The side panel's selector: the source file the route opens.

import { bytes, hex } from "./model/format.ts";
import { findUnit, neighbours } from "./model/index.ts";
import { ASSEMBLY_LIBRARY } from "./model/report.ts";
import { INSPECT, SDK } from "./strings.ts";
import type { Model, Unit } from "./types.ts";
import type { Ctx, Part, Views } from "./viewtypes.ts";

const F = INSPECT.fields;
type Inspector = NonNullable<Views["inspector"]>;
type Field = Inspector["fields"][number];

const field = (label: string, ...value: Part[]): Field => ({ label, value });
const text = (value: string, extra: Partial<Part> = {}): Part => ({ text: value, ...extra });

function unitFields(model: Model, unit: Unit): Field[] {
  const target = model.targetById.get(unit.target)!;
  const { previous, next } = neighbours(model, unit);
  const around = (other: Unit | null): Part[] =>
    other
      ? [
        text(other.name, { to: { fn: other.id } }),
        text(` ${other.addr}`, { code: true, mute: true }),
      ]
      : [text("-", { mute: true })];
  const fields: Field[] = [
    field(F.address, unit.addr ? text(unit.addr, { code: true }) : text("-", { mute: true })),
    field(F.size, text(bytes(unit.bytes))),
    field(F.status, text("", { status: unit.status })),
    field(F.functions, text(INSPECT.match(unit.matched, unit.functions.length))),
  ];
  if (unit.address !== null) {
    fields.splice(1, 0, field(F.ends, text(hex(unit.address + unit.bytes), { code: true })));
  }
  if (unit.fuzzyReported) fields.push(field(F.fuzzy, text(`${unit.fuzzy.toFixed(1)}%`)));
  fields.push(field(F.code, text(INSPECT.code[unit.kind])));
  if (unit.kind === "sdk") {
    fields.push(
      field(
        F.library,
        text(unit.library === ASSEMBLY_LIBRARY ? SDK.assemblyLibrary : (unit.library ?? "-")),
      ),
    );
    if (unit.member) fields.push(field(F.member, text(unit.member, { code: true })));
    if (unit.version) fields.push(field(F.version, text(unit.version)));
  }
  fields.push(
    field(F.image, text(target.name, { to: { view: { kind: "image", id: target.id } } })),
    field(F.group, text(target.groupLabel, { to: { view: { kind: "part", key: target.group } } })),
  );
  if (unit.source?.endsWith(".c")) fields.push(field(F.source, text(unit.source, { code: true })));
  else if (unit.source) fields.push(field(F.source, text(unit.source, { code: true, mute: true })));
  else {fields.push(field(
      F.source,
      text(
        unit.kind === "sdk"
          ? (unit.tier === "assembly" ? INSPECT.noSourceAssembly : INSPECT.noSourceSdk)
          : INSPECT.noSource,
        { mute: true },
      ),
    ));}
  fields.push(field(F.previous, ...around(previous)), field(F.next, ...around(next)));
  return fields;
}

export function inspector({ model, route }: Ctx): Views["inspector"] {
  if (!route.fn) return null;
  const unit = findUnit(model, route.fn);
  return unit
    ? { title: unit.id, fields: unitFields(model, unit) }
    : { title: route.fn, fields: [], message: INSPECT.notFound };
}
