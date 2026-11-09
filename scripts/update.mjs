#!/usr/bin/env node
// ใช้บันทึกยอดวิวของวันนี้ลง data/videos.json
//
//   node scripts/update.mjs ep1 instagram=1200 facebook=340 tiktok=5100
//   node scripts/update.mjs ep1 youtube=980 --date 2026-11-10
//
// ใส่เฉพาะแพลตฟอร์มที่มียอด ส่วนที่ไม่ใส่จะคงค่าล่าสุดเดิมไว้
import { PLATFORMS, loadData, saveData, addSnapshot, bangkokToday } from "./lib.mjs";

const args = process.argv.slice(2);
let date = bangkokToday();
const dIdx = args.indexOf("--date");
if (dIdx !== -1) {
  date = args[dIdx + 1];
  args.splice(dIdx, 2);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
  console.error("รูปแบบวันที่ต้องเป็น YYYY-MM-DD");
  process.exit(1);
}

const [id, ...pairs] = args;
if (!id || pairs.length === 0) {
  console.error("วิธีใช้: node scripts/update.mjs <id คลิป> instagram=123 facebook=45 ... [--date YYYY-MM-DD]");
  process.exit(1);
}

const views = {};
for (const pair of pairs) {
  const [platform, raw] = pair.split("=");
  const n = Number(raw);
  if (!PLATFORMS.includes(platform) || !Number.isInteger(n) || n < 0) {
    console.error(`ข้ามค่าที่ไม่ถูกต้อง: ${pair} (แพลตฟอร์มที่รองรับ: ${PLATFORMS.join(", ")})`);
    process.exit(1);
  }
  views[platform] = n;
}

const data = await loadData();
const video = data.videos.find((v) => v.id === id);
if (!video) {
  console.error(`ไม่พบคลิป id "${id}" (มี: ${data.videos.map((v) => v.id).join(", ")})`);
  process.exit(1);
}

addSnapshot(video, date, views);
await saveData(data);
console.log(`บันทึกแล้ว ${id} @ ${date}:`, views);
