import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function errorResponse(
  status: number,
  message: string,
  details?: unknown
): NextResponse {
  return NextResponse.json({ error: { status, message, details } }, { status });
}

function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return errorResponse(
      400,
      "Datos inválidos",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
    );
  }
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.message, error.details);
  }
  const code = prismaCode(error);
  if (code === "P2002") return errorResponse(409, "El registro ya existe");
  if (code === "P2034") {
    return errorResponse(409, "Conflicto de concurrencia, intenta de nuevo");
  }
  console.error(error);
  return errorResponse(500, "Error interno del servidor");
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new HttpError(400, "El cuerpo debe ser JSON válido");
  }
  return schema.parse(json);
}