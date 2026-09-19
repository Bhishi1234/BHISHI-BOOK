export function throwIf(error: { message?: string } | null | undefined) {
  if (!error?.message) return;
  throw new Error(humanize(error.message));
}

export function humanize(message: string) {
  return message
    .replace(/^.*ERROR:\s*/i, "")
    .replace(/^P0001:\s*/i, "")
    .replace(/^\w+:\s*/, "")
    .trim() || "Request failed";
}

export async function readJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(humanize(String(body.error || body.message || `HTTP ${res.status}`)));
  }
  return body;
}
