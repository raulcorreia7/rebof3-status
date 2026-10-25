// Number and text formatting shared by the page, the picture and the badge.

// One formatter for every call: `toLocaleString` builds a new one each time, which dominated the page load.
const grouped = new Intl.NumberFormat("en-US");
export const number = (value: number): string => grouped.format(value);
export const plural = (count: number, one: string, many = `${one}s`): string => `${number(count)} ${count === 1 ? one : many}`;
export const share = (done: number, total: number): number => (total ? (100 * done) / total : 0);
export const percent = (done: number, total: number, digits = 2): string => share(done, total).toFixed(digits);
export const hex = (value: number): string => `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
export const bytes = (value: number): string => `${number(value)} B`;
export const megabytes = (value: number): string => `${(value / 1e6).toFixed(1)} MB`;
export const round = (value: number): number => Math.round(value * 100) / 100;
export const escapeText = (text: string | number): string =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
