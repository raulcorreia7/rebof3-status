// The README badge: "C match" and the share of game functions rebuilt in C (the headline).

import { POSTER } from "../strings.ts";
import { percent, round, share } from "../model/format.ts";
import { textWidth } from "../model/text.ts";
import type { Model } from "../types.ts";
import { FONT } from "./svg.ts";

export function badge(model: Model): string {
  const { game } = model.headline;
  const value = `${percent(game.exact, game.functions, 1)}%`;
  const key = POSTER.badge;
  const [kw, vw] = [textWidth(key, 11) + 14, textWidth(value, 11) + 14];
  const high = share(game.exact, game.functions);
  const color = high >= 66 ? "#2ea043" : high >= 33 ? "#d29922" : "#b3402f";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(kw + vw)}" height="20" role="img" aria-label="${key}: ${value}" font-family="${FONT}" font-size="11">` +
    `<rect width="${round(kw)}" height="20" fill="#555"/><rect x="${round(kw)}" width="${round(vw)}" height="20" fill="${color}"/>` +
    `<g fill="#fff" text-anchor="middle"><text x="${round(kw / 2)}" y="14">${key}</text><text x="${round(kw + vw / 2)}" y="14">${value}</text></g></svg>`
  );
}
