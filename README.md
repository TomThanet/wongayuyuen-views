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

## ดึงยอด YouTube อัตโนมัติ (ไม่บังคับ)

1. สร้าง API key ของ YouTube Data API v3 ใน Google Cloud
2. ใน GitHub: Settings → Secrets and variables → Actions → New repository secret ชื่อ `YT_API_KEY`
3. workflow `.github/workflows/update-youtube.yml` จะดึงยอดทุกวัน 21:00 เวลาไทย
   (รันเองได้จากแท็บ Actions → Run workflow) ถ้าไม่มี secret จะข้ามโดยไม่ error

ส่วน Instagram, Facebook และ Threads ต้องใช้ Meta Graph API พร้อม access token ส่วน TikTok ต้องใช้ API ที่ต้องขออนุมัติ
จึงยังบันทึกยอดด้วยมือก่อน (เพิ่ม fetcher ภายหลังได้ในโฟลเดอร์ `scripts/` โดยใช้ `addSnapshot` ใน `lib.mjs`)

## ทดสอบในเครื่อง

```bash
python3 -m http.server 8000
# เปิด http://localhost:8000
```

## หมายเหตุเรื่องตัวเลข

- ยอดรวมเป็นผลบวกแต่ละแพลตฟอร์ม ไม่ใช่จำนวนคนไม่ซ้ำ
- นิยาม "วิว" ของแต่ละแพลตฟอร์มไม่เหมือนกัน
