/**
 * Scroll to a section without changing the hash, which carries the page state. `smooth` animates
 * it unless the system asks for reduced motion; a page load jumps.
 */
export function scrollToSection(id: string, smooth = true): void {
  const target = document.getElementById(id);
  if (!target) return;
  const calm = !smooth || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  target.focus({ preventScroll: true });
}
