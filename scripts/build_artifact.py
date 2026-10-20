#!/usr/bin/env python3
"""Dựng bản dashboard ngành chạy trên claude.ai (artifact riêng tư) có khung chat Trợ lý AI.

Đầu ra: bot/assistant.html (nội dung trang, không có doctype/html/head/body — nền tảng tự bọc).
Publish bằng Artifact tool tới URL trong docs/tro-ly-ai.md với `files` = FILES dưới đây.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = 'https://mdnguyen-cyber.github.io/bank-dashboard/'
FILES = ['assets/fs.css', 'assets/chartkit.js', 'assets/notes.js', 'assets/sector.js', 'assets/chat.js', 'assets/chat-config.js',
         'assets/fin-success-logo.png', 'assets/favicon-32.png', 'assets/favicon-192.png',
         'data/global-data.js', 'data/vira-data.js', 'data/sector-data.js', 'data/notes-data.js', 'data/bot-context.json']

html = (ROOT / 'nganh.html').read_text(encoding='utf-8')
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
title = re.search(r'<title>.*?</title>', head, re.S).group(0)
links = [l for l in re.findall(r'<link[^>]+>', head)]
# trang CTG và các ngân hàng khác: mở bản công khai
body = body.replace('value="index.html"', f'value="{PAGES}index.html"').replace('href="nganh.html"', 'href="#"')
body = body.replace('<script src="assets/chartkit.js"></script>', '<script>window.FS_ARTIFACT = true;</script>\n<script src="assets/chartkit.js"></script>')
page = title + '\n' + '\n'.join(links) + '\n' + body.strip() + '\n'
(ROOT / 'bot/assistant.html').write_text(page, encoding='utf-8')
print('bot/assistant.html', len(page) // 1024, 'KB ·', json.dumps({f: f for f in FILES}))
