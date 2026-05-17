// Worker UID format: NK-XXXXXX where X is from the safe alphabet
// (no ambiguous chars: excludes I, O, 0, 1)
export const WORKER_UID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const WORKER_UID_REGEX = /^NK-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const isValidWorkerUid = (value: unknown): value is string =>
  typeof value === "string" && WORKER_UID_REGEX.test(value);

export const normalizeWorkerUid = (value: string): string =>
  value.trim().toUpperCase();
