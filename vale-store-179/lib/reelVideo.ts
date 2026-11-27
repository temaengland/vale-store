import "server-only";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";

// Builds a short vertical Reel (720×1280, H.264 + AAC) that is meant to SELL:
//   1. Hook — the item full-size, a big one-line hook fades in on top.
//   2. Details — full-screen close-ups and photos, one short fact each.
//   3. Price reveal — the price, big.
//   4. End card — CharmChase, website, shop address.
// Cuts land on the beat of the music (simple beat detection below), photos
// slowly push in, text fades in. Text is drawn with sharp + bundled fonts.

const W = 720;
const H = 1280;
const FPS = 30;
const FADE = 0.22; // quick cross-fade between shots (feels like a cut, but smoother)
const MAX_PHOTOS = 5;

const FONT_DIR = path.join(process.cwd(), "assets", "reel");
const SERIF = { family: "Playfair Display Medium", file: path.join(FONT_DIR, "PlayfairDisplay_500Medium.ttf") };
const SANS = { family: "Inter Medium", file: path.join(FONT_DIR, "Inter_500Medium.ttf") };

export type ReelItem = { name: string; pricePence: number; era?: string | null };
/** Words on screen. Written by AI from the listing (see lib/reels.ts) or by simple rules. */
export type ReelScript = { hook: string; facts: string[] };

function ffmpegPath() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require("ffmpeg-static") as string | null;
  if (!p) throw new Error("ffmpeg is not available on this server.");
  return p;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function price(p: number) {
  return `£${(p / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ---------- text ----------

/** Text rendered at 2× and scaled down so edges stay smooth. */
async function textImage(text: string, font: { family: string; file: string }, size: number, width: number, color = "#ffffff") {
  const big = await sharp({
    text: {
      text: `<span foreground="${color}">${esc(text)}</span>`,
      font: `${font.family} ${size * 2}`,
      fontfile: font.file,
      width: width * 2,
      rgba: true,
      dpi: 72,
      align: "centre",
      wrap: "word",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  const w = Math.max(1, Math.round(big.info.width / 2));
  const h = Math.max(1, Math.round(big.info.height / 2));
  const data = await sharp(big.data).resize(w, h, { fit: "fill" }).png().toBuffer();
  return { data, w, h };
}

/** Soft dark glow behind text (reads on any photo without a hard box). */
async function glow(w: number, h: number, opacity = 0.55) {
  const pad = 40;
  return sharp(
    Buffer.from(
      `<svg width="${w + pad * 2}" height="${h + pad * 2}"><rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="30" fill="black" fill-opacity="${opacity}"/></svg>`
    )
  )
    .blur(22)
    .png()
    .toBuffer();
}

function pill(w: number, h: number, opacity = 0.62) {
  return Buffer.from(
    `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${Math.round(h / 2)}" fill="black" fill-opacity="${opacity}"/></svg>`
  );
}

/** Transparent full-frame PNG with overlays — faded in over the moving picture. */
async function layer(parts: sharp.OverlayOptions[]) {
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts)
    .png()
    .toBuffer();
}

async function hookLayer(hook: string) {
  const t = await textImage(hook, SERIF, 50, W - 110);
  const top = 130;
  const g = await glow(t.w, t.h, 0.5);
  return {
    bottom: top + t.h + 40,
    png: await layer([
      { input: g, top: top - 40, left: Math.round((W - t.w) / 2) - 40 },
      { input: t.data, top, left: Math.round((W - t.w) / 2) },
    ]),
  };
}

async function factLayer(fact: string) {
  const t = await textImage(fact, SANS, 34, W - 150);
  const pw = Math.min(W - 60, t.w + 64);
  const ph = t.h + 36;
  const top = H - ph - 190;
  return layer([
    { input: pill(pw, ph), top, left: Math.round((W - pw) / 2) },
    { input: t.data, top: top + 18, left: Math.round((W - t.w) / 2) },
  ]);
}

async function priceLayer(item: ReelItem) {
  const name = item.name.length > 70 ? item.name.slice(0, 68).replace(/\s+\S*$/, "") + "…" : item.name;
  const p = await textImage(price(item.pricePence), SERIF, 96, W - 100);
  const n = await textImage(name, SANS, 26, W - 140, "#e9dcc3");
  const total = p.h + 22 + n.h;
  const top = Math.round(H * 0.66);
  const g = await glow(Math.max(p.w, n.w), total, 0.55);
  return layer([
    { input: g, top: top - 40, left: Math.round((W - Math.max(p.w, n.w)) / 2) - 40 },
    { input: p.data, top, left: Math.round((W - p.w) / 2) },
    { input: n.data, top: top + p.h + 22, left: Math.round((W - n.w) / 2) },
  ]);
}

// ---------- pictures ----------

/**
 * Makes the item fill the frame: trims plain empty background (white sheet,
 * wall…); otherwise crops to 4:5 around the most detailed area.
 */
async function focusOnItem(photo: Buffer) {
  try {
    const src = await sharp(photo).rotate().toBuffer({ resolveWithObject: true });
    const { width: sw, height: sh } = src.info;
    const t = await sharp(src.data).trim({ threshold: 18 }).toBuffer({ resolveWithObject: true });
    const kept = (t.info.width * t.info.height) / (sw * sh);
    if (kept >= 0.08 && kept <= 0.9) {
      const pad = Math.round(Math.max(t.info.width, t.info.height) * 0.04);
      const bg = await sharp(src.data).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
      return sharp(t.data)
        .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: bg[0], g: bg[1], b: bg[2] } })
        .toBuffer();
    }
    if (sw / sh > 0.82) {
      return sharp(src.data)
        .resize(Math.round(sh * 0.8), sh, { fit: "cover", position: sharp.strategy.attention })
        .toBuffer();
    }
    return src.data;
  } catch {
    return photo;
  }
}

/** The whole item as a rounded "card" with a shadow on a blurred backdrop. */
async function cardShot(photo: Buffer, dim = 0.5, reserveTop = 0) {
  const p = await focusOnItem(photo);
  const bg = await sharp(p).resize(W, H, { fit: "cover" }).blur(32).modulate({ brightness: dim }).toBuffer();
  const maxH = reserveTop ? H - reserveTop - 150 : Math.round(H * 0.66);
  const fg = await sharp(p).resize(W - 60, maxH, { fit: "inside" }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = fg.info;
  const left = Math.round((W - w) / 2);
  const top = reserveTop ? reserveTop + Math.round((H - reserveTop - 110 - h) / 2) : Math.round((H - h) / 2) + 40;
  const r = 24;
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}"/></svg>`);
  const rounded = await sharp(fg.data).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const shadow = await sharp(
    Buffer.from(
      `<svg width="${W}" height="${H}"><rect x="${left}" y="${top + 14}" width="${w}" height="${h}" rx="${r}" fill="black" fill-opacity="0.6"/></svg>`
    )
  )
    .blur(18)
    .png()
    .toBuffer();
  return sharp(bg)
    .composite([
      { input: shadow, top: 0, left: 0 },
      { input: rounded, top, left },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Full-screen close-up on the most interesting part of the photo. */
async function detailShot(photo: Buffer, zoom = 1.7) {
  const src = await sharp(photo).rotate().toBuffer({ resolveWithObject: true });
  const scale = Math.max((W * zoom) / src.info.width, (H * zoom) / src.info.height, H / src.info.height);
  const big = await sharp(src.data)
    .resize(Math.round(src.info.width * scale), Math.round(src.info.height * scale))
    .toBuffer();
  return sharp(big)
    .resize(W, H, { fit: "cover", position: sharp.strategy.attention })
    .modulate({ brightness: 0.96, saturation: 1.06 })
    .sharpen({ sigma: 0.6 })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Price reveal backdrop: the item smaller, in the upper part of the frame. */
async function priceShot(photo: Buffer) {
  const p = await focusOnItem(photo);
  const bg = await sharp(p).resize(W, H, { fit: "cover" }).blur(40).modulate({ brightness: 0.3 }).toBuffer();
  const fg = await sharp(p).resize(W - 200, Math.round(H * 0.46), { fit: "inside" }).toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = fg.info;
  const left = Math.round((W - w) / 2);
  const top = Math.round(H * 0.6 - h) - 20;
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="22"/></svg>`);
  const rounded = await sharp(fg.data).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return sharp(bg).composite([{ input: rounded, top: Math.max(60, top), left }]).jpeg({ quality: 90 }).toBuffer();
}

async function endCard(item: ReelItem, photo: Buffer) {
  const bg = await sharp(photo).rotate().resize(W, H, { fit: "cover" }).blur(36).modulate({ brightness: 0.32 }).toBuffer();
  const lines = [
    await textImage("CharmChase", SERIF, 58, W - 100),
    await textImage("Antiques & Vintage · Evesham", SANS, 24, W - 100, "#d9c7a5"),
    await textImage("Shop online", SANS, 26, W - 100, "#d9c7a5"),
    await textImage("charmchase.co.uk", SERIF, 44, W - 100),
    await textImage("or visit us at 51 High Street, Evesham", SANS, 24, W - 100, "#d9c7a5"),
  ];
  const gaps = [12, 80, 8, 60];
  const total = lines.reduce((s, l) => s + l.h, 0) + gaps.reduce((a, b) => a + b, 0);
  let y = Math.round((H - total) / 2);
  const overlays: sharp.OverlayOptions[] = [];
  lines.forEach((l, i) => {
    overlays.push({ input: l.data, top: y, left: Math.round((W - l.w) / 2) });
    y += l.h + (gaps[i] ?? 0);
  });
  return sharp(bg).composite(overlays).jpeg({ quality: 90 }).toBuffer();
}

// ---------- process helpers ----------

function run(bin: string, args: string[], timeoutMs: number, collectStdout = false) {
  return new Promise<Buffer>((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", collectStdout ? "pipe" : "ignore", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    if (collectStdout) p.stdout!.on("data", (d: Buffer) => out.push(d));
    p.stderr!.on("data", (d: Buffer) => {
      err = (err + d.toString()).slice(-3000);
    });
    const t = setTimeout(() => {
      p.kill("SIGKILL");
      reject(new Error("Video took too long to build."));
    }, timeoutMs);
    p.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg failed: ${err.split("\n").filter(Boolean).slice(-6).join(" | ")}`));
    });
  });
}

/**
 * Very small beat finder: loudness envelope → onsets → autocorrelation.
 * Returns the beat length and a start point (seconds) in the most lively
 * part of the first minute, aligned to a beat.
 */
async function findBeat(musicFile: string) {
  const SR = 11025;
  const HOP = 256; // ~23 ms
  try {
    const pcm = await run(
      ffmpegPath(),
      ["-hide_banner", "-loglevel", "error", "-t", "75", "-i", musicFile, "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"],
      15_000,
      true
    );
    const n = Math.floor(pcm.length / 2 / HOP);
    if (n < 400) throw new Error("short");
    const env = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < HOP; j++) {
        const v = pcm.readInt16LE((i * HOP + j) * 2) / 32768;
        s += v * v;
      }
      env[i] = Math.sqrt(s / HOP);
    }
    const onset = new Float64Array(n);
    for (let i = 1; i < n; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
    const fps = SR / HOP;
    // Tempo between 70 and 140 BPM.
    let best = 0;
    let bestLag = Math.round(fps * 0.5);
    for (let lag = Math.round((fps * 60) / 140); lag <= Math.round((fps * 60) / 70); lag++) {
      let s = 0;
      for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
      if (s > best) {
        best = s;
        bestLag = lag;
      }
    }
    // Most lively 20 s window (skip quiet intros).
    const win = Math.round(fps * 20);
    let bestStart = 0;
    let bestEnergy = -1;
    for (let st = 0; st + win < n; st += Math.round(fps)) {
      let e = 0;
      for (let i = st; i < st + win; i++) e += env[i];
      if (e > bestEnergy) {
        bestEnergy = e;
        bestStart = st;
      }
    }
    // Phase: the offset within one beat with the strongest onsets.
    let bestPhase = 0;
    let bestPhaseScore = -1;
    for (let ph = 0; ph < bestLag; ph++) {
      let s = 0;
      for (let i = bestStart + ph; i < Math.min(n, bestStart + win); i += bestLag) s += onset[i];
      if (s > bestPhaseScore) {
        bestPhaseScore = s;
        bestPhase = ph;
      }
    }
    return { beat: bestLag / fps, start: (bestStart + bestPhase) / fps };
  } catch {
    return { beat: 0.5, start: 0 };
  }
}

// ---------- the Reel ----------

type Shot = { still: Buffer; overlay?: Buffer; beats: number; zoom: "in" | "out" | "slow" | "none" };

/**
 * Returns the finished MP4 (+ cover) and its length in seconds.
 * photos: image bytes (first = cover). music: audio bytes (mp3/m4a) or null.
 */
export async function buildReel(item: ReelItem, photos: Buffer[], music?: Buffer | null, script?: ReelScript) {
  if (!photos.length) throw new Error("No photos.");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "reel-"));
  try {
    const use = photos.slice(0, MAX_PHOTOS);
    const meta = await Promise.all(use.map((p) => sharp(p).metadata().catch(() => ({ width: 0, height: 0 }))));
    const sharpEnough = (i: number) => Math.min(meta[i].width || 0, meta[i].height || 0) >= 1000;
    const hook = script?.hook?.trim() || item.name;
    const facts = (script?.facts || []).map((f) => f.trim()).filter(Boolean).slice(0, 3);

    // Beat grid.
    let musicFile = "";
    let beat = 0.5;
    let musicStart = 0;
    if (music && music.length) {
      musicFile = path.join(dir, "music");
      await fs.writeFile(musicFile, music);
      const b = await findBeat(musicFile);
      beat = b.beat;
      musicStart = b.start;
    }
    // Keep shots between ~1.2 and ~2.6 s whatever the tempo.
    const beatsFor = (target: number) => Math.max(1, Math.round(target / beat));

    // Shot list: hook → close-up → photos with facts → price → end card.
    const shots: Shot[] = [];
    const hk = await hookLayer(hook);
    shots.push({ still: await cardShot(use[0], 0.5, hk.bottom), overlay: hk.png, beats: beatsFor(2.6), zoom: "slow" });
    let f = 0;
    if (sharpEnough(0)) {
      shots.push({
        still: await detailShot(use[0]),
        overlay: facts[f] ? await factLayer(facts[f++]) : undefined,
        beats: beatsFor(1.8),
        zoom: "in",
      });
    }
    for (let i = 1; i < use.length; i++) {
      const close = sharpEnough(i) && i % 2 === 0;
      shots.push({
        still: close ? await detailShot(use[i], 1.45) : await cardShot(use[i]),
        overlay: facts[f] ? await factLayer(facts[f++]) : undefined,
        beats: beatsFor(close ? 1.6 : 1.8),
        zoom: i % 2 ? "out" : "in",
      });
    }
    shots.push({ still: await priceShot(use[0]), overlay: await priceLayer(item), beats: beatsFor(2.4), zoom: "none" });
    shots.push({ still: await endCard(item, use[0]), beats: beatsFor(2.6), zoom: "none" });

    const durs = shots.map((s) => s.beats * beat);
    // Each cross-fade overlaps two shots, so every shot but the first is
    // lengthened by FADE to keep cuts exactly on the beat.
    const lens = durs.map((d) => d + FADE);
    const total = durs.reduce((a, b) => a + b, 0) + FADE;

    const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];
    const inputs: string[] = [];
    let idx = 0;
    const stillIdx: number[] = [];
    const ovIdx: (number | null)[] = [];
    for (let i = 0; i < shots.length; i++) {
      const sf = path.join(dir, `s${i}.jpg`);
      await fs.writeFile(sf, shots[i].still);
      inputs.push("-i", sf);
      stillIdx.push(idx++);
      if (shots[i].overlay) {
        const of = path.join(dir, `o${i}.png`);
        await fs.writeFile(of, shots[i].overlay!);
        inputs.push("-loop", "1", "-framerate", String(FPS), "-t", lens[i].toFixed(3), "-i", of);
        ovIdx.push(idx++);
      } else ovIdx.push(null);
    }
    args.push(...inputs);
    const audioIdx = idx;
    if (musicFile) args.push("-ss", musicStart.toFixed(3), "-i", musicFile);
    else args.push("-f", "lavfi", "-t", String(total), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");

    const fl: string[] = [];
    shots.forEach((s, i) => {
      const frames = Math.round(lens[i] * FPS);
      const rate = s.zoom === "slow" ? 0.0009 : s.zoom === "none" ? 0 : 0.0022;
      const z = s.zoom === "out" ? `max(1.1-${rate}*on,1)` : s.zoom === "none" ? "1" : `min(1+${rate}*on,1.12)`;
      fl.push(
        `[${stillIdx[i]}:v]scale=${W * 2}:${H * 2},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[z${i}]`
      );
      if (ovIdx[i] !== null) {
        fl.push(`[${ovIdx[i]}:v]format=rgba,fade=t=in:st=0.12:d=0.35:alpha=1[t${i}]`);
        fl.push(`[z${i}][t${i}]overlay=0:0:shortest=1,format=yuv420p[v${i}]`);
      } else fl.push(`[z${i}]null[v${i}]`);
    });
    let last = "v0";
    let offset = 0;
    for (let i = 1; i < shots.length; i++) {
      offset += durs[i - 1];
      const out = i === shots.length - 1 ? "vout" : `x${i}`;
      fl.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}[${out}]`);
      last = out;
    }
    fl.push(
      `[${audioIdx}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.25,afade=t=out:st=${Math.max(0, total - 1.6).toFixed(2)}:d=1.6,volume=0.9,aresample=44100[aout]`
    );

    const out = path.join(dir, "reel.mp4");
    args.push(
      "-filter_complex",
      fl.join(";"),
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "21",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(FPS),
      "-g",
      String(FPS * 2),
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-ac",
      "2",
      "-ar",
      "44100",
      "-t",
      total.toFixed(3),
      "-movflags",
      "+faststart",
      out
    );
    await run(ffmpegPath(), args, 50_000);
    const video = await fs.readFile(out);
    const cover = shots[0].still;
    return { video, cover, seconds: Math.round(total * 10) / 10 };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------- Reels from your own video clips (update 111) ----------

export type SoundMode = "both" | "music" | "original";

/** Duration and whether the clip has sound (ffmpeg-static ships without ffprobe). */
async function probe(file: string) {
  const info = await new Promise<string>((resolve) => {
    const p = spawn(ffmpegPath(), ["-hide_banner", "-i", file], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr!.on("data", (d: Buffer) => (err += d.toString()));
    p.on("close", () => resolve(err));
    p.on("error", () => resolve(err));
  });
  const m = info.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const duration = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  const v = info.match(/Stream #\d+:\d+[^:]*: Video: [^\n]*?(\d{2,5})x(\d{2,5})/);
  return {
    duration,
    hasAudio: /Stream #\d+:\d+[^:]*: Audio:/.test(info),
    width: v ? Number(v[1]) : 0,
    height: v ? Number(v[2]) : 0,
  };
}

/**
 * Your clip (up to ~16 s) with the hook and facts on top, then the price
 * card and the CharmChase end card. Sound: your clip's own sound, music, or both.
 * `photo` (a product photo) is used as the backdrop of the price/end cards.
 */
export async function buildClipReel(
  item: ReelItem,
  clip: Buffer,
  photo: Buffer | null,
  opts: { script?: ReelScript; music?: Buffer | null; sound?: SoundMode; maxClip?: number } = {}
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "clip-"));
  try {
    const clipFile = path.join(dir, "clip");
    await fs.writeFile(clipFile, clip);
    const info = await probe(clipFile);
    if (!info.duration) throw new Error("Couldn't read this video file.");
    const start = info.duration > 4 ? 0.3 : 0;
    const clipLen = Math.max(2, Math.min(opts.maxClip ?? 16, info.duration - start));

    // A frame from the video if there is no product photo.
    let backdrop = photo;
    if (!backdrop) {
      const f = path.join(dir, "frame.jpg");
      await run(ffmpegPath(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(Math.min(1, info.duration / 2)), "-i", clipFile, "-frames:v", "1", f], 20_000);
      backdrop = await fs.readFile(f);
    }

    const hook = opts.script?.hook?.trim() || item.name;
    const facts = (opts.script?.facts || []).map((x) => x.trim()).filter(Boolean).slice(0, 3);

    // Text timeline over the clip: hook first, then the facts spread out.
    const layers: { file: string; from: number; to: number }[] = [];
    const hk = await hookLayer(hook);
    const hookEnd = Math.min(3.2, clipLen - 0.3);
    await fs.writeFile(path.join(dir, "L0.png"), hk.png);
    layers.push({ file: path.join(dir, "L0.png"), from: 0.15, to: hookEnd });
    const room = clipLen - hookEnd;
    const n = Math.min(facts.length, Math.max(0, Math.floor(room / 2)));
    for (let i = 0; i < n; i++) {
      const slot = room / n;
      const f = path.join(dir, `L${i + 1}.png`);
      await fs.writeFile(f, await factLayer(facts[i]));
      layers.push({ file: f, from: hookEnd + i * slot + 0.2, to: hookEnd + (i + 1) * slot - 0.1 });
    }

    const priceFile = path.join(dir, "price.jpg");
    const priceOv = path.join(dir, "priceov.png");
    const endFile = path.join(dir, "end.jpg");
    await fs.writeFile(priceFile, await priceShot(backdrop));
    await fs.writeFile(priceOv, await priceLayer(item));
    await fs.writeFile(endFile, await endCard(item, backdrop));

    const PRICE = 2.4;
    const END = 2.6;
    const total = clipLen + PRICE + END - 2 * FADE;

    const sound: SoundMode = opts.sound || "both";
    let musicFile = "";
    let musicStart = 0;
    if (opts.music && opts.music.length && sound !== "original") {
      musicFile = path.join(dir, "music");
      await fs.writeFile(musicFile, opts.music);
      musicStart = (await findBeat(musicFile)).start;
    }

    const args = ["-y", "-hide_banner", "-loglevel", "error"];
    args.push("-ss", String(start), "-t", clipLen.toFixed(3), "-i", clipFile); // 0
    layers.forEach((l) => args.push("-loop", "1", "-framerate", String(FPS), "-t", clipLen.toFixed(3), "-i", l.file)); // 1..k
    const pI = layers.length + 1;
    args.push("-i", priceFile, "-loop", "1", "-framerate", String(FPS), "-t", PRICE.toFixed(2), "-i", priceOv, "-i", endFile);
    const poI = pI + 1;
    const eI = pI + 2;
    const mI = eI + 1;
    if (musicFile) args.push("-ss", musicStart.toFixed(3), "-i", musicFile);
    else args.push("-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100");

    const fl: string[] = [];
    // Clip → vertical 720×1280: vertical clips fill the frame; others sit on a blurred copy.
    const vertical = info.height >= info.width;
    if (vertical) {
      fl.push(`[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,format=yuv420p[c0]`);
    } else {
      fl.push(
        `[0:v]fps=${FPS},split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:2,eq=brightness=-0.12[bg];[b]scale=${W}:-2[fg];[bg][fg]overlay=0:(H-h)/2,setsar=1,format=yuv420p[c0]`
      );
    }
    let cur = "c0";
    layers.forEach((l, i) => {
      const k = i + 1;
      fl.push(
        `[${k}:v]format=rgba,fade=t=in:st=${l.from.toFixed(2)}:d=0.35:alpha=1,fade=t=out:st=${Math.max(l.from + 0.4, l.to - 0.3).toFixed(2)}:d=0.3:alpha=1[l${k}]`
      );
      fl.push(`[${cur}][l${k}]overlay=0:0:shortest=1[c${k}]`);
      cur = `c${k}`;
    });
    fl.push(`[${cur}]trim=0:${clipLen.toFixed(3)},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p[vclip]`);
    const still = (i: number, d: number, label: string) =>
      `[${i}:v]scale=${W * 2}:${H * 2},zoompan=z='1':d=${Math.round(d * FPS)}:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[${label}]`;
    fl.push(still(pI, PRICE, "pz"));
    fl.push(`[${poI}:v]format=rgba,fade=t=in:st=0.1:d=0.35:alpha=1[po]`);
    fl.push(`[pz][po]overlay=0:0:shortest=1,fps=${FPS},format=yuv420p[vprice]`);
    fl.push(still(eI, END, "vend"));
    fl.push(`[vclip][vprice]xfade=transition=fade:duration=${FADE}:offset=${(clipLen - FADE).toFixed(3)}[x1]`);
    fl.push(`[x1][vend]xfade=transition=fade:duration=${FADE}:offset=${(clipLen + PRICE - 2 * FADE).toFixed(3)}[vout]`);

    // Sound.
    const tail = `afade=t=out:st=${Math.max(0, total - 1.6).toFixed(2)}:d=1.6,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo`;
    if (sound !== "music" && info.hasAudio) {
      fl.push(`[0:a]atrim=0:${clipLen.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:${total.toFixed(3)}[orig]`);
      if (musicFile) {
        fl.push(`[${mI}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.35[mus]`);
        fl.push(`[orig][mus]amix=inputs=2:duration=longest:normalize=0,${tail}[aout]`);
      } else fl.push(`[orig]${tail}[aout]`);
    } else {
      fl.push(`[${mI}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,volume=0.9,${tail}[aout]`);
    }

    const out = path.join(dir, "reel.mp4");
    args.push(
      "-filter_complex", fl.join(";"),
      "-map", "[vout]", "-map", "[aout]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
      "-r", String(FPS), "-g", String(FPS * 2),
      "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-ar", "44100",
      "-t", total.toFixed(3), "-movflags", "+faststart", out
    );
    await run(ffmpegPath(), args, 52_000);
    const video = await fs.readFile(out);
    const coverFile = path.join(dir, "cover.jpg");
    await run(ffmpegPath(), ["-y", "-hide_banner", "-loglevel", "error", "-ss", "1", "-i", out, "-frames:v", "1", coverFile], 15_000).catch(() => Buffer.alloc(0));
    const cover = await fs.readFile(coverFile).catch(() => backdrop!);
    return { video, cover, seconds: Math.round(total * 10) / 10 };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
