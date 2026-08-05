// Markdown to PDF via Edge headless (no dependencies)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const mdPath = process.argv[2];
if (!mdPath) {
  console.error('Usage: node md2pdf.js <markdown-file>');
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');
const outPdf = mdPath.replace(/\.md$/, '.pdf');

// Simple MD->HTML: headings, bold, links, images, code blocks, lists
let html = md
  .replace(/^### (.+)$/gm, '<h3>$1</h3>')
  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:1em 0">')
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/```([^`]+)```/gs, '<pre><code>$1</code></pre>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  .replace(/^\- (.+)$/gm, '<li>$1</li>')
  .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
  .replace(/<\/li>\n<li>/g, '</li><li>')
  .replace(/^\|(.+)\|$/gm, (m) => {
    const cells = m.split('|').slice(1, -1).map(c => c.trim());
    return '<tr>' + cells.map(c => c.match(/^-+$/) ? '' : `<td>${c}</td>`).join('') + '</tr>';
  })
  .replace(/(<tr>.*<\/tr>\n?)+/gs, '<table>$&</table>')
  .replace(/\n\n/g, '<p>');

const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;max-width:900px;margin:2em auto;padding:0 2em;color:#333}
h1,h2,h3{margin-top:1.5em;color:#000}
h1{font-size:2em;border-bottom:2px solid #000;padding-bottom:0.3em}
h2{font-size:1.5em;border-bottom:1px solid #ccc;padding-bottom:0.2em}
h3{font-size:1.2em}
code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-family:Consolas,monospace;font-size:0.9em}
pre{background:#f8f8f8;border:1px solid #ddd;border-radius:4px;padding:1em;overflow-x:auto}
pre code{background:none;padding:0}
a{color:#0366d6;text-decoration:none}
a:hover{text-decoration:underline}
table{border-collapse:collapse;width:100%;margin:1em 0}
td,th{border:1px solid #ddd;padding:8px 12px;text-align:left}
th{background:#f2f2f2;font-weight:bold}
blockquote{border-left:4px solid #ddd;padding-left:1em;color:#666;margin:1em 0}
ul{margin:0.5em 0;padding-left:2em}
li{margin:0.3em 0}
img{display:block;margin:1em auto}
</style></head><body>${html}</body></html>`;

const tmpHtml = mdPath.replace(/\.md$/, '.tmp.html');
fs.writeFileSync(tmpHtml, htmlDoc, 'utf8');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const args = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--print-to-pdf=' + path.resolve(outPdf),
  '--print-to-pdf-no-header',
  'file:///' + path.resolve(tmpHtml).replace(/\\/g, '/')
];

console.log('Generating PDF...');
const proc = spawn(edge, args);
proc.on('close', (code) => {
  fs.unlinkSync(tmpHtml);
  if (code === 0 && fs.existsSync(outPdf)) {
    console.log('✓ ' + outPdf);
  } else {
    console.error('✗ Edge exited with code ' + code);
    process.exit(1);
  }
});
