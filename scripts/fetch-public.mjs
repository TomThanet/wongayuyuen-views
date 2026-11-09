#!/usr/bin/env node
// ดึงยอดวิวจากหน้าสาธารณะของ YouTube และ TikTok (ไม่ต้องล็อกอิน ไม่ใช้ API key)
// Instagram / Facebook / Threads ต้องล็อกอินจึงอ่านผ่านเบราว์เซอร์ แล้วบันทึกด้วย update.mjs
//
//   node scripts/fetch-public.mjs           # ทุกคลิป
//   node scripts/fetch-public.mjs --dry     # แสดงผลโดยไม่บันทึก
import { loadData, saveData, addSnapshot, bangkokToday } from "./lib.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const dry = process.argv.includes("--dry");

async function html(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "th,en;q=0.8" }, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function youtubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    const m = u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
    return m ? m[1] : u.searchParams.get("v");
  } catch {
    return null;
  }
}

async function youtubeViews(url) {
  const id = youtubeId(url);
  if (!id) throw new Error("อ่าน video id ไม่ได้");
  const body = await html(`https://www.youtube.com/watch?v=${id}`);
  const m = body.match(/"viewCount":"(\d+)"/);
  if (!m) throw new Error("ไม่พบ viewCount");
  return Number(m[1]);
}

async function tiktokViews(url) {
  const body = await html(url);
  // ใช้ playCount ในบล็อก stats ของวิดีโอ (ตัวแรกที่เป็นตัวเลข)
  const m = body.match(/"playCount":(\d+)/);
  if (!m) throw new Error("ไม่พบ playCount");
  return Number(m[1]);
}

const data = await loadData();
const today = bangkokToday();
let failed = 0;

for (const video of data.videos) {
  const views = {};
  for (const [platform, fn] of [["youtube", youtubeViews], ["tiktok", tiktokViews]]) {
    const url = video.links?.[platform];
    if (!url) continue;
    try {
      views[platform] = await fn(url);
    } catch (err) {
      failed++;
      console.warn(`${video.id} ${platform}: ${err.message}`);
    }
  }
  if (Object.keys(views).length) {
    console.log(video.id, views);
    if (!dry) addSnapshot(video, today, views);
  }
}

if (!dry) await saveData(data);
if (failed) console.warn(`ดึงไม่สำเร็จ ${failed} รายการ`);
