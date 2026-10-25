import type { Food } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Söker livsmedel på namn. `signal` låter oss avbryta en gammal sökning. */
export async function searchFoods(q: string, signal?: AbortSignal): Promise<Food[]> {
  const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  return res.json();
}

/** Slår upp en produkt på streckkod. Kastar ApiError med status 404 eller 422 vid problem. */
export async function getFoodByBarcode(code: string): Promise<Food> {
  const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`);
  if (res.ok) return res.json();

  const body = await res.json().catch(() => ({}));
  throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
}