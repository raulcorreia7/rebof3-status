// Number and text formatting shared by the page, the picture and the badge.

// One formatter for every call: `toLocaleString` builds a new one each time, which dominated the page load.
const grouped = new Intl.NumberFormat("en-US");
export const number = (value: number): string => grouped.format(value);
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${number(count)} ${count === 1 ? one : many}`;
export const share = (done: number, total: number): number => (total ? (100 * done) / total : 0);
export const percent = (done: number, total: number, digits = 2): string =>
  share(done, total).toFixed(digits);
export const hex = (value: number): string =>
  `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
// Sizes in binary units (1 KB = 1,024 bytes), the way PlayStation memory and disc sizes are quoted.
const UNITS = ["B", "KB", "MB"];
const unitOf = (value: number): number => (value >= 1024 * 1024 ? 2 : value >= 1024 ? 1 : 0);
const inUnit = (value: number, unit: number): string => {
  const scaled = value / 1024 ** unit;
  return unit === 0 ? number(value) : scaled.toFixed(scaled >= 100 ? 0 : 1);
};
export const bytes = (value: number): string =>
  `${inUnit(value, unitOf(value))} ${UNITS[unitOf(value)]}`;
// "731 KB of 3.0 MB": each side in its own unit, so a size reads the same in every view.
export const bytesOf = (done: number, total: number): string => `${bytes(done)} of ${bytes(total)}`;
export const round = (value: number): number => Math.round(value * 100) / 100;
export const escapeText = (text: string | number): string =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(
    /"/g,
    "&quot;",
  );
