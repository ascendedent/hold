export function setVolume(set) {
  const num = (value) => {
    if (value == null || value === "") return 0;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  let total = num(set.weight) * num(set.reps);
  if (num(set.weight_r) > 0) total += num(set.weight_r) * (num(set.reps_r) || num(set.reps));
  if (total <= 0) return null;
  return Math.round(total * 10) / 10;
}

export function formatVolume(volume, unit = "lb") {
  if (volume == null || Number(volume) <= 0) return "";
  const text = String(Math.round(Number(volume))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${text} ${unit}`;
}
