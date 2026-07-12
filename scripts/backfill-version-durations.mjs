// One-time backfill: compute `duration_seconds` for existing versions that
// predate on-upload duration capture, so the app can show track/album times
// without the browser sniffing every audio file (the cause of the album/home
// pages' infinite loading, device heat, and iOS crash loops).
//
// New uploads already store their duration (set_version_file). This walks the
// rows still missing it, reads each file's length, and writes it back.
//
// Provide the Supabase URL and service-role key any one of these ways — the
// simplest and most shell-proof is the first (arguments work identically on
// macOS, Linux, and every Windows shell):
//
//   A. As arguments:
//        node scripts/backfill-version-durations.mjs <URL> <SERVICE_ROLE_KEY>
//
//   B. In .env.local / .env at the repo root (both git-ignored):
//        NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
//      then: node scripts/backfill-version-durations.mjs
//
//   C. As real environment variables you exported in the shell.
//
// The service-role key bypasses RLS to update versions directly; keep it out of
// the browser and out of git. Re-runnable: it only touches rows where
// duration_seconds is null. Files are uploaded as .m4a, so duration is read
// from the MP4 `mvhd` atom (no external tools or npm deps). Anything that
// doesn't parse is logged and left null for a manual pass.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Best-effort load of .env.local then .env (real env vars still win). Minimal
// parser: KEY=VALUE lines, ignores blanks/comments, strips surrounding quotes
// and a UTF-8 BOM. Records where it looked, for the diagnostic below.
const envFiles = [];
for (const file of [".env.local", ".env"]) {
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    envFiles.push({ file, path, found: false, keys: [] });
    continue;
  }
  const keys = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^﻿/, "").replace(/\r$/, "");
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const name = m[1];
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    keys.push(name);
    if (process.env[name] === undefined) process.env[name] = value;
  }
  envFiles.push({ file, path, found: true, keys });
}

const [argUrl, argKey] = process.argv.slice(2);
const url =
  argUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = argKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  console.error(`\nMissing ${missing.join(" and ")}.\n`);
  console.error("Where I looked for a .env file:");
  for (const e of envFiles) {
    console.error(
      e.found
        ? `  • ${e.path} — found, keys: ${e.keys.join(", ") || "(none parsed)"}`
        : `  • ${e.path} — not found`
    );
  }
  console.error(
    "\nQuickest fix — pass them as arguments (works in any shell):\n" +
      "  node scripts/backfill-version-durations.mjs " +
      '"https://YOURPROJECT.supabase.co" "your-service-role-key"\n'
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/**
 * Duration (seconds) from an MP4/M4A buffer, read from the movie header
 * (`moov` › `mvhd`: timescale + duration). Returns null if not an MP4 or the
 * atom is absent. Scans boxes without decoding audio.
 */
function mp4Duration(buf) {
  // Find the `moov` container among the top-level boxes.
  const moov = findBox(buf, 0, buf.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(buf, moov.start, moov.end, "mvhd");
  if (!mvhd) return null;

  let p = mvhd.start; // points at the mvhd payload
  const version = buf[p];
  p += 4; // version (1) + flags (3)
  let timescale;
  let duration;
  if (version === 1) {
    p += 8 + 8; // creation + modification time (64-bit each)
    timescale = buf.readUInt32BE(p);
    p += 4;
    duration = Number(buf.readBigUInt64BE(p));
  } else {
    p += 4 + 4; // creation + modification time (32-bit each)
    timescale = buf.readUInt32BE(p);
    p += 4;
    duration = buf.readUInt32BE(p);
  }
  if (!timescale || !Number.isFinite(duration)) return null;
  return duration / timescale;
}

/**
 * Locate a direct child box by type within [from, to). Returns the payload
 * range { start, end }, i.e. just past the 8- (or 16-) byte box header.
 */
function findBox(buf, from, to, type) {
  let p = from;
  while (p + 8 <= to) {
    let size = buf.readUInt32BE(p);
    const boxType = buf.toString("ascii", p + 4, p + 8);
    let header = 8;
    if (size === 1) {
      // 64-bit largesize
      size = Number(buf.readBigUInt64BE(p + 8));
      header = 16;
    } else if (size === 0) {
      // extends to end of the enclosing range
      size = to - p;
    }
    if (size < header) return null; // malformed
    if (boxType === type) return { start: p + header, end: p + size };
    p += size;
  }
  return null;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("versions")
    .select("id,resource_url")
    .is("duration_seconds", null)
    .not("resource_url", "is", null);
  if (error) throw new Error(error.message);

  if (!rows || rows.length === 0) {
    console.log("Nothing to backfill — all versions already have a duration.");
    return;
  }

  console.log(`Backfilling ${rows.length} version(s)…`);
  let ok = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const res = await fetch(row.resource_url);
      if (!res.ok) {
        console.warn(`✗ ${row.id}: fetch ${res.status}`);
        skipped++;
        continue;
      }
      const seconds = mp4Duration(Buffer.from(await res.arrayBuffer()));
      if (seconds == null) {
        console.warn(`✗ ${row.id}: could not read duration (not m4a?)`);
        skipped++;
        continue;
      }
      const { error: upErr } = await supabase
        .from("versions")
        .update({ duration_seconds: seconds })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`✓ ${row.id} → ${seconds.toFixed(1)}s`);
      ok++;
    } catch (err) {
      console.warn(`✗ ${row.id}: ${err.message}`);
      skipped++;
    }
  }
  console.log(`\nDone. Updated ${ok}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
