import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const PLATFORMS = ["instagram", "facebook", "youtube", "tiktok", "threads"];

const DATA_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "videos.json"
);

export async function loadData() {
  return JSON.parse(await readFile(DATA_FILE, "utf8"));
}

export async function saveData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** วันที่ปัจจุบันตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function bangkokToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/**
 * เพิ่ม/อัปเดต snapshot ของวันนั้น (รวมกับค่าที่มีอยู่ของวันเดียวกัน)
 * views = { instagram: 123, ... } ส่งมาเฉพาะแพลตฟอร์มที่มีข้อมูล
 */
export function addSnapshot(video, date, views) {
  let snap = video.snapshots.find((s) => s.date === date);
  if (!snap) {
    snap = { date, views: {} };
    video.snapshots.push(snap);
    video.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }
  Object.assign(snap.views, views);
  return snap;
}
