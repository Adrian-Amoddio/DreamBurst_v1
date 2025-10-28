const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export async function fetchBrief(prompt) {
  const r = await fetch(`${API_BASE}/initial_prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchImages(prompt, n = 6) {
  const r = await fetch(`${API_BASE}/image_batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, n }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchPalette(image) {
  const r = await fetch(`${API_BASE}/palette`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
