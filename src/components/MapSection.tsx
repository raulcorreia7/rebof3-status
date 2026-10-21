import type { ComponentChildren } from "preact";
import { MAP } from "../strings.ts";
import { percent } from "../model/format.ts";
import type { MapTab } from "../model/route.ts";
import { usePage } from "../state.tsx";
import { Legend } from "./Legend.tsx";
import { StripMap } from "./StripMap.tsx";
import { TreemapChart } from "./TreemapChart.tsx";
import { Help, Section } from "./ui.tsx";

const TABS: [MapTab, string][] = [
  ["tiles", MAP.tabs.tiles],
  ["sdk", MAP.scopes.sdk],
  ["strips", MAP.tabs.strips],
];

export function MapSection() {
  const { model, route, go } = usePage();
  const { game, sdk } = model;
  const view = route.view;
  const title =
    route.map === "sdk"
      ? MAP.sdkTitle(percent(sdk.done, sdk.count), sdk.done, sdk.count)
      : MAP.gameTitle(percent(game.done, game.count), game.done, game.count);

  // What the map shows for the route: the zoom target of the treemap and the targets of the strips.
  const group = view.kind === "group" ? model.groups.find((g) => g.key === view.key) : undefined;
  const target = view.kind === "target" ? model.targetById.get(view.id) : undefined;
  const focus = route.map === "sdk" ? (route.lib ? `l:${route.lib}` : null) : target ? `t:${target.id}` : group ? `g:${group.key}` : null;
  const stripTargets = target ? [target] : group ? group.targets : model.targets;

  const trail: [string, () => void][] = [[route.map === "sdk" ? MAP.scopes.sdk : MAP.scopes.game, () => (route.map === "sdk" ? go({ lib: null }) : go({ view: { kind: "home" } }))]];
  if (route.map !== "sdk") {
    const owner = target ? model.groups.find((g) => g.key === target.group) : group;
    if (owner) trail.push([owner.label, () => go({ view: { kind: "group", key: owner.key } })]);
    if (target) trail.push([target.name, () => go({ view: { kind: "target", id: target.id } })]);
  } else if (route.lib) trail.push([route.lib, () => go({ lib: route.lib })]);

  return (
    <Section id="map" title={MAP.heading}>
      <div class="tabs" role="group" aria-label={MAP.heading}>
        {TABS.map(([tab, label]) => (
          <button type="button" key={tab} class={`tab${route.map === tab ? " on" : ""}`} aria-pressed={route.map === tab} onClick={() => go({ map: tab }, true)}>
            {label}
          </button>
        ))}
      </div>
      <h3>{route.map === "strips" ? MAP.tabs.strips : title}</h3>
      <Help>{route.map === "tiles" ? MAP.tilesHelp : route.map === "sdk" ? MAP.sdkHelp : MAP.stripsHelp}</Help>
      <Legend counts />
      {route.map !== "strips" ? (
        <Breadcrumb trail={trail}>
          <TreemapChart key={route.map} scope={route.map === "sdk" ? "sdk" : "game"} focus={focus} />
        </Breadcrumb>
      ) : (
        <StripMap targets={stripTargets} />
      )}
      {route.map !== "strips" ? <p class="mute small">{MAP.textFallback}</p> : null}
    </Section>
  );
}

function Breadcrumb({ trail, children }: { trail: [string, () => void][]; children: ComponentChildren }) {
  return (
    <>
      <nav class="crumbs" aria-label="Map zoom">
        {trail.map(([label, action], index) => (
          <span key={`${index}-${label}`}>
            {index > 0 ? <span aria-hidden="true"> › </span> : null}
            {index < trail.length - 1 ? (
              <button type="button" class="link" onClick={action}>
                {label}
              </button>
            ) : (
              <b aria-current="location">{label}</b>
            )}
          </span>
        ))}
      </nav>
      {children}
    </>
  );
}
