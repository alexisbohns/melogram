// One-time backfill: compute `waveform_peaks` for existing versions that
// predate on-upload waveform capture, so the app can paint a track's waveform
// without the browser downloading and decoding audio itself (the cause of the
// album/home pages' infinite loading, device heat, and iOS crash loops — see
// supabase/migrations/20260712001200_version_duration.sql and this column's
// own migration, 20260919010000_waveform_peaks.sql).
//
// New uploads already compute peaks in the browser (audioPeaksFromFile in
// src/lib/edit.ts). This walks the rows still missing them, decodes each file
// with ffmpeg (there is no MP4-atom shortcut for waveform data — it takes real
// decoding), buckets the samples the same way audioPeaksFromFile does, and
// writes the result back.
//
// Provide the Supabase URL and service-role key any one of these ways — the
// simplest and most shell-proof is the first (arguments work identically on
// macOS, Linux, and every Windows shell):
//
//   A. As arguments:
//        node scripts/backfill-version-waveforms.mjs <URL> <SERVICE_ROLE_KEY>
//
//   B. In .env.local / .env at the repo root (both git-ignored):
//        NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
//      then: node scripts/backfill-version-waveforms.mjs
//
//   C. As real environment variables you exported in the shell.
//
// The service-role key bypasses RLS to update versions directly; keep it out of
// the browser and out of git. Re-runnable: it only touches rows where
// waveform_peaks is null. Requires `ffmpeg` on PATH (checked once, up front).
// Anything that doesn't decode is logged and left null for a manual pass.

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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
      "  node scripts/backfill-version-waveforms.mjs " +
      '"https://YOURPROJECT.supabase.co" "your-service-role-key"\n'
  );
  process.exit(1);
}

// ffmpeg does the actual decoding — check once, up front, so a missing
// install fails with one clear instruction instead of 28 identical errors.
const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
if (ffmpegCheck.error || ffmpegCheck.status !== 0) {
  console.error(
    "\nffmpeg is required but was not found on PATH.\n" +
      "Install it (e.g. `brew install ffmpeg` on macOS) and re-run.\n"
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Bars stored per version — must match PEAK_COUNT in src/lib/edit.ts so rows
// filled here and rows filled by the browser look identical.
const PEAK_COUNT = 512;

/**
 * Downsample a decoded mono PCM signal to {@link PEAK_COUNT} absolute-value
 * buckets, normalized 0..1. Mirrors audioPeaksFromFile in src/lib/edit.ts
 * exactly: same bucket count, same max-abs per bucket, same
 * normalize-by-observed-max.
 */
function bucketPeaks(data) {
  const bucket = Math.floor(data.length / PEAK_COUNT) || 1;
  const peaks = [];
  let max = 0;
  for (let i = 0; i < PEAK_COUNT; i += 1) {
    let peak = 0;
    const start = i * bucket;
    for (let j = start; j < start + bucket && j < data.length; j += 1) {
      const value = Math.abs(data[j]);
      if (value > peak) peak = value;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  // Normalize so quiet masters still fill the bar height.
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/**
 * Decode an audio file with ffmpeg to 8 kHz mono float32 PCM and return it as
 * a Float32Array. 8 kHz mono is plenty of signal for 512 buckets and keeps
 * ffmpeg's output small. Throws if ffmpeg exits non-zero.
 */
function decodeToPcm(path) {
  const args = [
    "-v", "error", "-i", path, "-ac", "1", "-ar", "8000",
    "-f", "f32le", "-",
  ];
  const res = spawnSync("ffmpeg", args, {
    maxBuffer: 1024 * 1024 * 1024,
    encoding: "buffer",
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString("utf8").trim() : "";
    throw new Error(`ffmpeg exited ${res.status}${stderr ? `: ${stderr}` : ""}`);
  }
  const buf = res.stdout;
  const floats = new Float32Array(
    buf.buffer,
    buf.byteOffset,
    Math.floor(buf.length / 4)
  );
  return floats;
}

async function main() {
  const { data: rows, error } = await supabase
    .from("versions")
    .select("id,resource_url")
    .is("waveform_peaks", null)
    .not("resource_url", "is", null);
  if (error) throw new Error(error.message);

  if (!rows || rows.length === 0) {
    console.log("Nothing to backfill — all versions already have peaks.");
    return;
  }

  console.log(`Backfilling ${rows.length} version(s)…`);
  let ok = 0;
  let skipped = 0;
  for (const row of rows) {
    const tmpPath = join(tmpdir(), `melogram-waveform-${randomUUID()}`);
    try {
      const res = await fetch(row.resource_url);
      if (!res.ok) {
        console.warn(`✗ ${row.id}: fetch ${res.status}`);
        skipped++;
        continue;
      }
      writeFileSync(tmpPath, Buffer.from(await res.arrayBuffer()));

      const pcm = decodeToPcm(tmpPath);
      if (!pcm.length) {
        console.warn(`✗ ${row.id}: ffmpeg produced no samples`);
        skipped++;
        continue;
      }
      const peaks = bucketPeaks(pcm);

      const { error: upErr } = await supabase
        .from("versions")
        .update({ waveform_peaks: peaks })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`✓ ${row.id} → ${peaks.length} peaks`);
      ok++;
    } catch (err) {
      console.warn(`✗ ${row.id}: ${err.message}`);
      skipped++;
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        // never existed, or already gone — fine
      }
    }
  }
  console.log(`\nDone. Updated ${ok}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
