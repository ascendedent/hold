export async function api(op, payload = {}) {
  const response = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Could not save");
  return data.result;
}
