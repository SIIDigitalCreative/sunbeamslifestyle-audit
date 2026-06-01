import { NextRequest, NextResponse } from "next/server";

const KV_URL   = process.env.KV_REST_API_URL  || process.env.KV_URL  || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || "";

async function kvGet(key: string) {
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const { result } = await r.json();
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

async function kvSet(key: string, value: object) {
  // Upstash REST: POST /set  body is [key, value_as_string]
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) {
    const text = await r.text();
    console.error("kvSet failed:", r.status, text);
  }
  return r.ok;
}

// GET /api/progress?key=audit_progress_mystore_com
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "audit_progress_default";
  try {
    const data = await kvGet(key);
    return NextResponse.json(data || {});
  } catch (e) {
    console.error("KV GET error", e);
    return NextResponse.json({}, { status: 500 });
  }
}

// POST /api/progress  body: { key: string, data: object }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key = "audit_progress_default", data } = body;
    if (!data) return NextResponse.json({ error: "no data" }, { status: 400 });
    const ok = await kvSet(key, data);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("KV SET error", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
