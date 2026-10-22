#!/usr/bin/env bash
# Gom file trang vào _site (dùng trong pages.yml). data/raw (response WiData gốc) và scripts không publish.
set -e
rm -rf _site; mkdir -p _site/data _site/assets
cp *.html .nojekyll _site/
cp assets/*.js assets/*.css assets/fin-success-logo.png assets/favicon-32.png assets/favicon-192.png assets/favicon.ico _site/assets/
cp assets/favicon.ico _site/favicon.ico
cp data/*.js _site/data/
[ -f data/vira-data.js ] && cp data/vira-data.js _site/data/ || echo "window.VIRA_DATA = null;" > _site/data/vira-data.js
# Gắn mã commit vào đường dẫn script để trình duyệt không dùng bản cache cũ sau mỗi lần deploy
V=${GITHUB_SHA::7}
for f in _site/*.html; do
  sed -i -E "s#(data/[a-z0-9-]+\.js|assets/[a-z0-9-]+\.js|assets/fs\.css)\"#\1?v=$V\"#g" "$f"
done
grep -c "?v=" _site/*.html
