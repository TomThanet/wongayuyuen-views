#!/bin/bash
# ดึงยอด YouTube และ TikTok ของทุกคลิป แล้ว push ขึ้นรีโปข้อมูล (ไม่ใช้ AI ไม่เสียโควตา Claude)
# ถูกเรียกโดย launchd ทุก 3 ชั่วโมง (ดู README ส่วน "ตั้งเวลาอัตโนมัติบนเครื่อง")
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

echo "=== $(TZ=Asia/Bangkok date '+%F %H:%M') auto-fetch ==="

# ถ้าในโฟลเดอร์มีการแก้ไขค้าง (เช่น task AI กำลังทำงานอยู่) ให้ข้ามรอบนี้ ไม่ไปทับงานของคนอื่น
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "มีการแก้ไขค้างในโฟลเดอร์ ข้ามรอบนี้"
  exit 0
fi

git pull -q --rebase origin main
node scripts/fetch-public.mjs

if [ -n "$(git status --porcelain data)" ]; then
  git add data/videos.json
  git -c user.name="$(git config user.name || echo views-bot)" \
      -c user.email="$(git config user.email || echo views-bot@users.noreply.github.com)" \
      commit -q -m "data: auto YouTube/TikTok $(TZ=Asia/Bangkok date '+%F %H:%M')"
  git push -q origin main || { git pull -q --rebase origin main && git push -q origin main; }
  echo "push แล้ว: $(git log --oneline | head -1)"
else
  echo "ไม่มีการเปลี่ยนแปลง"
fi
