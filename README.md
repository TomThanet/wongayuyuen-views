# วงอายุยืน · ยอดวิวทุกช่องทาง

หน้าเว็บสรุปยอดวิวของทุกคลิปบน Instagram, Facebook, YouTube, TikTok และ Threads
เป็นไฟล์ HTML ล้วน อ่านข้อมูลจาก `data/videos.json` และโฮสต์บน GitHub Pages

## เพิ่มคลิปใหม่ (วันละคลิป)

แก้ `data/videos.json` เพิ่มรายการใน `videos` โดยตั้ง `id` ไม่ซ้ำ (เช่น `ep2`) ใส่ `title`, `published` (YYYY-MM-DD) และ `links` ของแต่ละแพลตฟอร์ม ปล่อย `snapshots` เป็น `[]`

## บันทึกยอดวิว

```bash
node scripts/update.mjs ep1 instagram=1200 facebook=340 youtube=980 tiktok=5100 threads=210
```

- ใส่เฉพาะแพลตฟอร์มที่มียอด ส่วนที่ไม่ใส่จะคงค่าล่าสุดเดิมไว้
- ระบุวันที่เองได้ด้วย `--date 2026-11-10` (ค่าเริ่มต้นคือวันนี้ตามเวลาไทย)
- จากนั้น `git add data/videos.json && git commit -m "update views" && git push`
- ในหน้าเว็บมี "ตัวช่วยบันทึกยอดวันนี้" ที่สร้างคำสั่งนี้ให้

ควรบันทึกวันละครั้งเวลาเดิม เพื่อให้กราฟเทียบกันได้

## ดึงยอดอัตโนมัติ

- `node scripts/fetch-public.mjs` อ่านยอด YouTube และ TikTok จากหน้าสาธารณะ (ไม่ใช้ API key) แล้วบันทึก snapshot ของวันนี้
- Threads อ่านยอดผ่านเบราว์เซอร์ (เห็นเป็น "N views" ในหน้าโพสต์) แล้วบันทึกด้วย `update.mjs`
- Instagram และ Facebook อ่านยอดวิวจากหน้าสาธารณะไม่ได้ ต้องกรอกเองด้วย `update.mjs` หรือเชื่อม Meta Graph API ภายหลัง
- Scheduled task ชื่อ `maxage-daily-views` (Claude Code บนเครื่องของ Tom) รันทุกวัน 09:00 ทำขั้นตอนข้างต้น เพิ่มคลิปใหม่ที่พบบน YouTube และ push เข้า main
- หน้าเว็บอยู่ที่ x.myclover.com/maxage/stat/ (รีโป cloverx-office) และอ่านไฟล์ `data/videos.json` ในรีโปนี้สดทุกครั้ง

ภาพปกเก็บใน `covers/` (JPEG กว้าง 720px) และอ้างใน `cover` ของแต่ละคลิป

## ทดสอบในเครื่อง

```bash
python3 -m http.server 8000
# เปิด http://localhost:8000
```

## หมายเหตุเรื่องตัวเลข

- ยอดรวมเป็นผลบวกแต่ละแพลตฟอร์ม ไม่ใช่จำนวนคนไม่ซ้ำ
- นิยาม "วิว" ของแต่ละแพลตฟอร์มไม่เหมือนกัน
