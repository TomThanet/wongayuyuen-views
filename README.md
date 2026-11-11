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

## ตั้งค่า Meta token (Facebook + Instagram)

สคริปต์ `scripts/fetch-meta.mjs` ดึงยอดผ่าน Graph API ต้องมี **Page access token** ของเพจ "วงอายุยืน x MaxAge" ที่คุณสร้างเอง

1. ที่ developers.facebook.com สร้าง App (ประเภท Business) แล้วเพิ่มสิทธิ์ `read_insights`, `pages_read_engagement`
   (ถ้าไม่ได้ข้อมูลให้ลองเพิ่ม `pages_manage_engagement`) และสำหรับ Instagram เพิ่ม `instagram_basic`, `instagram_manage_insights`
   IG ต้องเป็น Business/Creator และเชื่อมกับเพจแล้ว
2. ใช้ Graph API Explorer เลือก App และเพจ ขอ User token พร้อมสิทธิ์ข้างบน แล้วแลกเป็น long-lived token
   จากนั้นเรียก `GET /me/accounts` เพื่อได้ Page access token (อายุไม่จำกัดเมื่อมาจาก long-lived user token)
3. เก็บ token ในไฟล์บนเครื่องเท่านั้น (ห้ามใส่ในรีโป ห้ามส่งในแชต):

```bash
mkdir -p ~/.config/wongayuyuen && chmod 700 ~/.config/wongayuyuen
nano ~/.config/wongayuyuen/meta.env      # ใส่บรรทัด META_PAGE_TOKEN=...
chmod 600 ~/.config/wongayuyuen/meta.env
```

4. ทดสอบ (ไม่บันทึกอะไร):

```bash
node scripts/fetch-meta.mjs --check
```

ผลที่ถูกต้องจะบอกชื่อเพจ, IG ที่เชื่อม และชื่อ metric ที่ใช้ได้ของแต่ละคลิป ถ้า metric ถูกปฏิเสธ
(Meta เปลี่ยนชื่อบ่อย) แก้รายการ `FB_METRICS` / `IG_METRICS` ที่หัวไฟล์ได้

ใน `data/videos.json` คลิปที่ต้องการดึง Facebook ต้องมี `"ids": { "facebook": "<เลข reel id>" }`
(เลขท้ายของลิงก์ `facebook.com/reel/<id>` หลังเปิดลิงก์แชร์) ส่วน Instagram สคริปต์หา media id จากลิงก์เอง

## ตั้งเวลาอัตโนมัติบนเครื่อง (YouTube/TikTok ทุก 3 ชั่วโมง ไม่ใช้ AI)

- `scripts/auto-fetch.sh` รัน `fetch-public.mjs` แล้ว commit/push ถ้ามีการเปลี่ยนแปลง
- launchd job `com.cloverx.wongayuyuen-views` (ไฟล์ `~/Library/LaunchAgents/com.cloverx.wongayuyuen-views.plist`) เรียกทุก 3 ชั่วโมงที่นาที 35 (00:35, 03:35, ... 21:35)
- ใช้ **ก๊อปปี้แยก** ที่ `~/.local/share/wongayuyuen-views-auto` เพราะ macOS ไม่ให้งานตั้งเวลาเข้าโฟลเดอร์ Documents
- log อยู่ที่ `~/Library/Logs/wongayuyuen-views.log`
- ทดสอบ: `launchctl kickstart -k gui/$(id -u)/com.cloverx.wongayuyuen-views`
- หยุด: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.cloverx.wongayuyuen-views.plist`
- ต้องเปิดเครื่องและไม่หลับ ถ้าปิดเครื่อง รอบนั้นจะข้าม
- Facebook, Instagram, Threads และการตรวจคลิปใหม่ ยังทำโดย task `maxage-daily-views` วันละ 2 รอบ (09:00/21:00) หรือพิมพ์ "update"

## ทดสอบในเครื่อง

```bash
python3 -m http.server 8000
# เปิด http://localhost:8000
```

## หมายเหตุเรื่องตัวเลข

- ยอดรวมเป็นผลบวกแต่ละแพลตฟอร์ม ไม่ใช่จำนวนคนไม่ซ้ำ
- นิยาม "วิว" ของแต่ละแพลตฟอร์มไม่เหมือนกัน
