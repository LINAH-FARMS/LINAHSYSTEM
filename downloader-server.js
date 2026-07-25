const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

app.use(express.json());
app.use(express.static(__dirname));

app.post('/download', (req, res) => {
  const { url, quality } = req.body;
  if (!url) return res.status(400).json({ error: 'ضع رابط الفيديو' });

  const q = quality || 'best';
  const output = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
  const cmd = `yt-dlp -f ${q} -o "${output}" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr || err.message });
    res.json({ success: true, output: stdout });
  });
});

app.listen(3000, () => console.log('🟢 http://localhost:3000/downloader.html'));
