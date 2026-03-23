import https from 'node:https';
import fs from 'node:fs';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

if (!fs.existsSync('public/screenshots')) fs.mkdirSync('public/screenshots');
if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons');

const base = 'https://ui-avatars.com/api/?name=Z&background=0D0D18&color=00FFFF&font-size=0.5&bold=true';
const urls = [
  ['https://picsum.photos/seed/zdt2/1280/720', 'public/screenshots/desktop-1.png'],
  ['https://picsum.photos/seed/zmb2/390/844', 'public/screenshots/mobile-1.png'],
  [`${base}&size=72`, 'public/icons/icon-72.png'],
  [`${base}&size=96`, 'public/icons/icon-96.png'],
  [`${base}&size=128`, 'public/icons/icon-128.png'],
  [`${base}&size=192`, 'public/icons/icon-192.png'],
  [`${base}&size=512`, 'public/icons/icon-512.png'],
];

Promise.all(urls.map(([url, dest]) => download(url, dest)))
  .then(() => console.log('Downloaded ALL PWA assets!'))
  .catch(err => console.error('Error downloading:', err));
