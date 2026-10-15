import { NextResponse } from "next/server";

/**
 * Body of a BFF route whose backend counterpart doesn't exist yet. The UI
 * keys off `error` (and the 501 status); `todo` names the missing backend
 * contract so the gap is visible in the network tab and in tests.
 */
export type NotImplementedBody = {
  error: "not_implemented";
  detail: string;
  todo: string;
};

export function notImplemented(todo: string) {
  return NextResponse.json<NotImplementedBody>(
    { error: "not_implemented", detail: "Funcionalidade ainda não disponível no backend.", todo },
    { status: 501 },
  );
}
