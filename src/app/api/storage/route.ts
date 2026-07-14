import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Member-writable buckets. Mirrors the coarse `is_any_artist_member()` gate the
// storage.objects policies were meant to enforce (any artist member may write
// to either bucket; no per-path ownership check yet — see the storage policy
// migration).
const WRITABLE_BUCKETS = new Set(["versions", "covers"]);

/**
 * Server-side Storage writer. The Storage service isn't resolving `auth.uid()`
 * for uploads in this project, so the member-gated `storage.objects` policies
 * reject browser uploads even from valid members. Here we verify membership via
 * the caller's cookie session (PostgREST resolves the identity correctly) and
 * then write the object with the service role, which bypasses Storage RLS.
 *
 * Metadata still lives in Postgres and is written by the browser through the
 * existing member-gated RPCs (`set_version_file`, `set_album_cover`); this route
 * only moves the raw object put/delete server-side.
 */

async function requireMember(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Not signed in" };

  const { data: isMember, error } = await supabase.rpc("is_any_artist_member");
  if (error) return { ok: false, status: 500, error: error.message };
  if (!isMember) return { ok: false, status: 403, error: "Not an artist member" };
  return { ok: true };
}

export async function POST(request: Request) {
  const auth = await requireMember();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const bucket = form.get("bucket");
  const path = form.get("path");
  const file = form.get("file");

  if (typeof bucket !== "string" || !WRITABLE_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (typeof path !== "string" || !path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ path });
}

export async function DELETE(request: Request) {
  const auth = await requireMember();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as {
    bucket?: unknown;
    paths?: unknown;
  } | null;
  const bucket = body?.bucket;
  const paths = body?.paths;

  if (typeof bucket !== "string" || !WRITABLE_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (
    !Array.isArray(paths) ||
    paths.some((p) => typeof p !== "string") ||
    paths.length === 0
  ) {
    return NextResponse.json({ error: "Missing paths" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .remove(paths as string[]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ removed: (data ?? []).map((o) => o.name) });
}
