// Builds what the site serves for each level in /levels:
//   web/levels/index.json   list of levels (for the path pages)
//   web/levels/<id>.json    level.json plus its path and source file name (for the level page)
//
// Levels live in levels/<path>/<id>, where <path> is learning or finding.
//
//   npm run build
import { readdir, readFile, writeFile, mkdir, rm, stat, cp } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const levelsDir = join(root, "levels");
const outDir = join(root, "web", "levels");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const PATHS = ["learning", "finding"];

const index = [];
const seen = new Set();
for (const path of PATHS) for (const id of (await readdir(join(levelsDir, path))).sort()) {
  const dir = join(levelsDir, path, id);
  if (!(await stat(dir)).isDirectory()) continue;
  if (seen.has(id)) throw new Error(`${id}: used in more than one path`);
  seen.add(id);
  const meta = JSON.parse(await readFile(join(dir, "level.json"), "utf8"));
  if (meta.id !== id) throw new Error(`${id}: level.json id is "${meta.id}"`);

  const filesDir = join(dir, "files");
  const names = (await readdir(filesDir)).sort();
  const sourceName = names.find(n => n === "vuln.c" || n === "vuln.py");
  if (!sourceName) throw new Error(`${id}: files/ needs vuln.c or vuln.py`);
  if (!names.includes("check.sh")) throw new Error(`${id}: files/ needs check.sh`);

  await writeFile(join(outDir, `${id}.json`), JSON.stringify({ ...meta, path, sourceName }, null, 2));
  index.push({ id, path, title: meta.title, language: meta.language, difficulty: meta.difficulty });
  console.log(`built ${path}/${id} (${names.join(", ")})`);
}
await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2));


// Lessons for the C for hackers path: lessons/chapters.json lists the chapters
// and their topics, and each topic is an HTML file in lessons/.
const lessonsDir = join(root, "lessons");
const lessonsOut = join(root, "web", "lessons");
await rm(lessonsOut, { recursive: true, force: true });
const chapters = JSON.parse(await readFile(join(lessonsDir, "chapters.json"), "utf8"));
for (const chapter of chapters) for (const topic of chapter.topics) {
  await stat(join(lessonsDir, topic.file)).catch(() => { throw new Error(`lessons/${topic.file} is missing`); });
}
await cp(lessonsDir, lessonsOut, { recursive: true });
console.log(`built ${chapters.reduce((n, c) => n + c.topics.length, 0)} lesson topic(s)`);

// Sitemap for search engines: the main pages, every lesson topic and every level
const urls = ["/", "/learn", "/find",
  ...chapters.flatMap(c => c.topics.map(t => `/learn/${t.id}`)),
  ...index.map(l => `/level/${l.id}`)];
await writeFile(join(root, "web", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://pwnctual.com${u}</loc></url>`).join("\n")}
</urlset>
`);
