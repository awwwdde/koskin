export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch("http://127.0.0.1:8100/healthz", { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error("Backend unavailable");
    return Response.json({ status: "ok", services: ["web", "api"] });
  } catch {
    return Response.json({ status: "unavailable", service: "api" }, { status: 503 });
  }
}
