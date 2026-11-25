// Empty in dev (Vite proxies /api). In production set VITE_API_URL to the backend URL.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}
