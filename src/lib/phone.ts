export function phone10(input: string) {
  const digits = input.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) throw new Error("phone must be 10 digits");
  return digits;
}

export function e164in(digits: string) {
  return `+91${phone10(digits)}`;
}
