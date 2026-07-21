'use strict';
// Download an event cover and convert it to WebP (project convention: cwebp -q 92 -m 6).
// Falls back to the original file if cwebp is not installed.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sourceExtension(url) {
    return (url.match(/\.(jpe?g|png|webp)(?:\?|$)/i) || [, 'jpg'])[1].toLowerCase();
}

function coverOutputPath(id) {
    return `assets/events/${id}.webp`;
}

async function downloadAndConvertCover(imageUrl, id, imagesDir) {
    const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfroPassoBot/1.0)' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    fs.mkdirSync(imagesDir, { recursive: true });
    const ext = sourceExtension(imageUrl);
    const tmpPath = path.join(imagesDir, `${id}.src.${ext}`);
    fs.writeFileSync(tmpPath, Buffer.from(await response.arrayBuffer()));
    const webpPath = path.join(imagesDir, `${id}.webp`);
    try {
        execFileSync('cwebp', ['-q', '92', '-m', '6', tmpPath, '-o', webpPath], { stdio: 'ignore' });
        fs.unlinkSync(tmpPath);
        return coverOutputPath(id);
    } catch (error) {
        const keptPath = path.join(imagesDir, `${id}.${ext}`);
        fs.renameSync(tmpPath, keptPath);
        console.warn(`cwebp niedostępny — zapisano oryginał ${id}.${ext} (skonwertuj ręcznie).`);
        return `assets/events/${id}.${ext}`;
    }
}

module.exports = { sourceExtension, coverOutputPath, downloadAndConvertCover };
