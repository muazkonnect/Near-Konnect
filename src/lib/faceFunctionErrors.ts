export interface FaceFunctionErrorDetails {
  code?: string;
  message: string;
  status?: number;
}

type MaybeFacePayload = {
  code?: unknown;
  duplicate?: unknown;
  error?: unknown;
};

const DUPLICATE_FACE_CODE = "duplicate_face";

function asPayload(value: unknown): MaybeFacePayload | null {
  if (!value || typeof value !== "object") return null;
  return value as MaybeFacePayload;
}

function getErrorStatus(error: unknown): number | undefined {
  const candidate = error as { status?: unknown; context?: { status?: unknown } } | null;
  if (typeof candidate?.context?.status === "number") return candidate.context.status;
  if (typeof candidate?.status === "number") return candidate.status;
  return undefined;
}

export async function getFaceFunctionErrorDetails(
  error: unknown,
  data?: unknown,
): Promise<FaceFunctionErrorDetails | null> {
  const payload = asPayload(data);
  if (!error && typeof payload?.error !== "string") return null;

  let message = typeof payload?.error === "string"
    ? payload.error
    : error instanceof Error
      ? error.message
      : "Face verification failed.";
  let code = typeof payload?.code === "string" ? payload.code : undefined;

  const context = (error as { context?: { json?: () => Promise<unknown> } } | null)?.context;
  if (context?.json) {
    try {
      const body = asPayload(await context.json());
      if (typeof body?.error === "string") message = body.error;
      if (typeof body?.code === "string") code = body.code;
    } catch {
      /* ignore malformed function error bodies */
    }
  }

  return {
    code,
    message,
    status: getErrorStatus(error),
  };
}

export function isDuplicateFaceResult(details: FaceFunctionErrorDetails | null | undefined, data?: unknown): boolean {
  const payload = asPayload(data);
  if (payload?.duplicate === true) return true;
  if (typeof payload?.code === "string" && payload.code === DUPLICATE_FACE_CODE) return true;
  if (details?.code === DUPLICATE_FACE_CODE) return true;

  const message = [
    typeof payload?.error === "string" ? payload.error : null,
    details?.message ?? null,
  ].find(Boolean)?.toLowerCase();

  return Boolean(message && message.includes("one account") && message.includes("face"));
}