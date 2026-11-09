#!/usr/bin/env node
// ดึงยอดวิว YouTube ของทุกคลิปผ่าน YouTube Data API v3 แล้วบันทึกเป็น snapshot ของวันนี้
// ต้องมีตัวแปรแวดล้อม YT_API_KEY (ถ้าไม่มีจะข้ามโดยไม่ถือว่าผิดพลาด)
import { loadData, saveData, addSnapshot, bangkokToday } from "./lib.mjs";

const key = process.env.YT_API_KEY;
if (!key) {
  console.log("ไม่มี YT_API_KEY ข้ามการดึงยอด YouTube");
  process.exit(0);
}

function videoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    const m = u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
    return m ? m[1] : u.searchParams.get("v");
  } catch {
    return null;
  }
}

const data = await loadData();
const targets = data.videos
  .map((v) => ({ video: v, yt: v.links?.youtube ? videoId(v.links.youtube) : null }))
  .filter((t) => t.yt);

if (targets.length === 0) {
  console.log("ไม่มีคลิปที่มีลิงก์ YouTube");
  process.exit(0);
}

const today = bangkokToday();
// API รับได้ครั้งละ 50 id
for (let i = 0; i < targets.length; i += 50) {
  const chunk = targets.slice(i, i + 50);
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("id", chunk.map((t) => t.yt).join(","));
  url.searchParams.set("key", key);
  const res = await fetch(url);
  if (!res.ok) {
    console.error("YouTube API error:", res.status, await res.text());
    process.exit(1);
  }
  const body = await res.json();
  const byId = new Map((body.items || []).map((it) => [it.id, it.statistics]));
  for (const t of chunk) {
    const stats = byId.get(t.yt);
    if (!stats || stats.viewCount === undefined) {
      console.warn(`ไม่พบสถิติของ ${t.video.id} (${t.yt})`);
      continue;
    }
    addSnapshot(t.video, today, { youtube: Number(stats.viewCount) });
    console.log(`${t.video.id}: YouTube ${stats.viewCount} วิว`);
  }
}

await saveData(data);
