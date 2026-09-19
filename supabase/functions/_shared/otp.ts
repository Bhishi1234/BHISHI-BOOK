export function phone10(input: string) {
  const digits = input.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) throw new Error("phone must be 10 digits");
  return digits;
}

export function e164in(digits: string) {
  return `+91${phone10(digits)}`;
}

export function phoneEmail(digits: string) {
  return `${phone10(digits)}@phone.bhishibook.local`;
}

export async function hashOtp(phone: string, code: string, pepper: string) {
  const bytes = new TextEncoder().encode(`${phone10(phone)}:${code}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function randomPassword() {
  return `${crypto.randomUUID()}Aa1!`;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

export function corsPreflight() {
  return new Response("ok", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}
