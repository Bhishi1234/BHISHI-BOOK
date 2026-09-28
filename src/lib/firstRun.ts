import type { User } from "../types";

export type FirstRunStage = "pending" | "creating" | "tour" | "done";

function keyOf(user: Pick<User, "id" | "phone">) {
  return `bhishi-first-run:${user.id || user.phone || "me"}`;
}

export function firstRunStage(user: Pick<User, "id" | "phone"> | null | undefined): FirstRunStage | null {
  if (!user || typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(keyOf(user));
  if (value === "pending" || value === "creating" || value === "tour" || value === "done") return value;
  return null;
}

/** Called once, on the thank-you page after a new signup. Later logins are left alone. */
export function beginFirstRun(user: Pick<User, "id" | "phone">) {
  if (typeof localStorage === "undefined") return;
  const key = keyOf(user);
  if (!localStorage.getItem(key)) localStorage.setItem(key, "pending");
}

export function setFirstRun(user: Pick<User, "id" | "phone">, stage: FirstRunStage) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(keyOf(user), stage);
}
