// Number and text formatting shared by the page, the picture and the badge.

export const number = (value: number): string => value.toLocaleString("en-US");
export const plural = (count: number, one: string, many = `${one}s`): string => `${number(count)} ${count === 1 ? one : many}`;
export const share = (done: number, total: number): number => (total ? (100 * done) / total : 0);
export const percent = (done: number, total: number, digits = 2): string => share(done, total).toFixed(digits);
export const hex = (value: number): string => `0x${value.toString(16).toUpperCase().padStart(8, "0")}`;
export const round = (value: number): number => Math.round(value * 100) / 100;
export const escapeText = (text: string | number): string =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
