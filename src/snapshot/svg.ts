// SVG string primitives for the picture: no DOM, so the same code runs in Node.

import { escapeText, round } from "../model/format.ts";
import { DARK } from "../theme/tokens.ts";

export const FONT = "'DejaVu Sans', Verdana, Arial, sans-serif";
export const C = DARK;

/** Text whose top edge is y; anchor is "start", "middle" or "end". */
export function text(
  x: number,
  y: number,
  content: string,
  size: number,
  fill: string,
  { anchor = "start", weight = "normal", outline = false }: { anchor?: string; weight?: string; outline?: boolean } = {},
): string {
  const halo = outline ? ` stroke="${C.bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"` : "";
  return (
    `<text x="${round(x)}" y="${round(y + size * 0.8)}" font-size="${size}" fill="${fill}"` +
    ` text-anchor="${anchor}" font-weight="${weight}"${halo} pointer-events="none">${escapeText(content)}</text>`
  );
}

export const rect = (x: number, y: number, w: number, h: number, fill: string, inner = ""): string => {
  const box = `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${fill}"`;
  return inner ? `${box}>${inner}</rect>` : `${box}/>`;
};

export const frame = (x: number, y: number, w: number, h: number, color: string): string =>
  `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="none" stroke="${color}" pointer-events="none"/>`;

/** A horizontal bar of parts [value, colour] against a total. */
export function bar(x: number, y: number, width: number, height: number, parts: [number, string][], total: number): string {
  let svg = rect(x, y, width, height, C.track);
  let at = x;
  for (const [value, color] of parts) {
    const w = total ? (value / total) * width : 0;
    if (w > 0) svg += rect(at, y, w, height, color);
    at += w;
  }
  return svg;
}
