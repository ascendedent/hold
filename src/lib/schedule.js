export function heartZones(age) {
  const years = Number(age);
  if (!years || years < 10 || years > 100) return null;
  const max = Math.round(208 - 0.7 * years);
  const band = (lo, hi) => `${Math.round(max * lo)}–${Math.round(max * hi)}`;
  return {
    max,
    warmup: band(0.5, 0.7),
    lifting: band(0.7, 0.85),
    finisher: band(0.8, 0.9),
  };
}
