import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worksDir = path.join(root, 'images', 'works');
const detailsPath = path.join(root, 'artwork-details.json');
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const details = JSON.parse(await fs.readFile(detailsPath, 'utf8'));
const folders = (await fs.readdir(worksDir, { withFileTypes: true }))
  .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
  .map(entry => entry.name)
  .sort((a, b) => a.localeCompare(b));

const collection = [];
for (const slug of folders) {
  const folder = path.join(worksDir, slug);
  let files = (await fs.readdir(folder, { withFileTypes: true }))
    .filter(entry => entry.isFile() && supported.has(path.extname(entry.name).toLowerCase()))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  if (!files.length) continue;
  const info = details[slug] ?? {};
  if (info.cover && files.includes(info.cover)) files = [info.cover, ...files.filter(file => file !== info.cover)];
  collection.push({
    slug,
    title: info.title || slug.split('-').map(word => word ? word[0].toUpperCase() + word.slice(1) : '').join(' '),
    year: info.year || '', medium: info.medium || 'Other', material: info.material || '',
    size: info.size || '', category: info.category || 'Painting', images: files.map(file =>
      `images/works/${encodeURIComponent(slug)}/${encodeURIComponent(file)}`),
    order: Number.isFinite(info.order) ? info.order : 999
  });
}
collection.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
const publicCollection = collection.map(({ order, ...work }) => work);
await fs.writeFile(path.join(root, 'collection-data.js'), `window.CollectionData = ${JSON.stringify(publicCollection, null, 2)};\n`);

const dist = path.join(root, 'dist');
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });
for (const name of ['index.html', 'collection-data.js']) await fs.copyFile(path.join(root, name), path.join(dist, name));
await fs.cp(path.join(root, 'images'), path.join(dist, 'images'), { recursive: true });
console.log(`Generated gallery for ${publicCollection.length} works.`);
