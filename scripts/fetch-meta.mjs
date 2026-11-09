#!/usr/bin/env node
// ดึงยอดวิว Facebook Reels และ Instagram Reels ผ่าน Meta Graph API
//
//   node scripts/fetch-meta.mjs           # ดึงทุกคลิปและบันทึก snapshot ของวันนี้
//   node scripts/fetch-meta.mjs --check   # ตรวจ token/สิทธิ์/ชื่อ metric โดยไม่บันทึกอะไร
//
// Token อ่านจาก (ลำดับ) ตัวแปรแวดล้อม META_PAGE_TOKEN หรือไฟล์ ~/.config/wongayuyuen/meta.env
//   META_PAGE_TOKEN=...            (Page access token ของเพจ "วงอายุยืน x MaxAge" บังคับ)
//   META_GRAPH_VERSION=v23.0       (ไม่บังคับ)
// ห้ามใส่ token ในรีโปนี้ สคริปต์ไม่พิมพ์ token ออกหน้าจอ
//
// ถ้าไม่มี token สคริปต์จะแจ้งแล้วจบแบบไม่ error เพื่อไม่ให้ task รายวันล้ม
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadData, saveData, addSnapshot, bangkokToday } from "./lib.mjs";

const check = process.argv.includes("--check");
const ENV_FILE = path.join(os.homedir(), ".config", "wongayuyuen", "meta.env");

// ชื่อ metric ของ Meta เปลี่ยนบ่อย จึงลองตามลำดับและใช้ตัวแรกที่ API ยอมรับ
const FB_METRICS = ["blue_reels_play_count", "post_video_views", "total_video_views"];
const IG_METRICS = ["views", "plays"];

async function readEnvFile() {
  try {
    const out = {};
    for (const line of (await readFile(ENV_FILE, "utf8")).split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = await readEnvFile();
const TOKEN = process.env.META_PAGE_TOKEN || fileEnv.META_PAGE_TOKEN;
const VERSION = process.env.META_GRAPH_VERSION || fileEnv.META_GRAPH_VERSION || "v23.0";

if (!TOKEN) {
  console.log(`ไม่พบ META_PAGE_TOKEN (ตั้งใน ${ENV_FILE}) ข้ามการดึงยอด Facebook/Instagram ดูวิธีตั้งใน README`);
  process.exit(0);
}

async function graph(pathAndQuery) {
  const url = `https://graph.facebook.com/${VERSION}/${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    const err = new Error(`${e.message || "HTTP " + res.status}${e.code ? ` (code ${e.code})` : ""}`);
    err.code = e.code;
    throw err;
  }
  return body;
}

/** อ่านค่า lifetime ตัวเลขตัวแรกจากผลของ insights ไม่ว่ารูปแบบจะเป็น values[] หรือ total_value */
function readValue(body) {
  const item = body?.data?.[0];
  if (!item) return null;
  const v = item.values?.[0]?.value ?? item.total_value?.value;
  return typeof v === "number" ? v : null;
}

async function firstWorkingMetric(endpoint, metrics, extra = "") {
  const errors = [];
  for (const metric of metrics) {
    try {
      const value = readValue(await graph(`${endpoint}?metric=${metric}${extra}`));
      if (value != null) return { metric, value };
      errors.push(`${metric}: ไม่มีค่า`);
    } catch (err) {
      errors.push(`${metric}: ${err.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

function shortcode(url) {
  const m = (url || "").match(/instagram\.com\/(?:reel|p|reels)\/([\w-]+)/);
  return m ? m[1] : null;
}

// ---- ตรวจตัวตนของ token ----
let me;
try {
  me = await graph("me?fields=id,name,instagram_business_account");
} catch (err) {
  console.error(`token ใช้ไม่ได้: ${err.message}`);
  process.exit(1);
}
const igUserId = me.instagram_business_account?.id || null;
console.log(`token ใช้ได้: เพจ "${me.name}" (${me.id})${igUserId ? ` · IG business account ${igUserId}` : " · ยังไม่พบ IG ที่เชื่อมกับเพจ"}`);

const data = await loadData();
const today = bangkokToday();

// แผนที่ shortcode → media id ของ IG (ดึงเมื่อมีคลิปที่ต้องใช้)
let igMap = null;
async function igMediaId(sc) {
  if (!igUserId) return null;
  if (!igMap) {
    igMap = new Map();
    let after = "";
    for (let page = 0; page < 6; page++) {
      const body = await graph(`${igUserId}/media?fields=id,permalink&limit=50${after ? `&after=${encodeURIComponent(after)}` : ""}`);
      for (const m of body.data || []) {
        const s = shortcode(m.permalink);
        if (s) igMap.set(s, m.id);
      }
      after = body.paging?.next ? body.paging.cursors?.after : "";
      if (!after) break;
    }
  }
  return igMap.get(sc) || null;
}

let problems = 0;
for (const video of data.videos) {
  const views = {};

  // Facebook: ต้องมี ids.facebook (เลข reel id จาก URL facebook.com/reel/<id>)
  const fbId = video.ids?.facebook;
  if (fbId) {
    try {
      const r = await firstWorkingMetric(`${fbId}/video_insights`, FB_METRICS);
      views.facebook = r.value;
      console.log(`${video.id} Facebook ${r.value} (metric ${r.metric})`);
    } catch (err) {
      problems++;
      console.warn(`${video.id} Facebook: ${err.message}`);
    }
  } else if (video.links?.facebook) {
    problems++;
    console.warn(`${video.id} Facebook: ไม่มี ids.facebook (เลข reel id) ใน data/videos.json`);
  }

  // Instagram: หา media id จาก shortcode ใน permalink
  const sc = shortcode(video.links?.instagram);
  if (sc) {
    try {
      const mediaId = video.ids?.instagram || (await igMediaId(sc));
      if (!mediaId) throw new Error("ไม่พบ media id ของ shortcode นี้ในบัญชี IG ที่เชื่อมกับเพจ");
      const r = await firstWorkingMetric(`${mediaId}/insights`, IG_METRICS);
      views.instagram = r.value;
      console.log(`${video.id} Instagram ${r.value} (metric ${r.metric})`);
    } catch (err) {
      problems++;
      console.warn(`${video.id} Instagram: ${err.message}`);
    }
  }

  if (!check && Object.keys(views).length) addSnapshot(video, today, views);
}

if (!check) await saveData(data);
console.log(check ? "ตรวจเสร็จ (ไม่ได้บันทึกอะไร)" : "บันทึกแล้ว");
if (problems) console.warn(`มี ${problems} รายการที่ดึงไม่สำเร็จ ดูข้อความด้านบน`);
