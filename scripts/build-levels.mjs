// Builds what the site serves for each level in /levels:
//   web/levels/index.json   list of levels (for the path pages)
//   web/levels/<id>.json    level.json plus the source file name (for the level page)
//
//   npm run build
import { readdir, readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

// "bugfix": wrong for normal input. "harden": works normally, but some inputs break it.
const CATEGORIES = ["bugfix", "harden"];

const root = new URL("..", import.meta.url).pathname;
const levelsDir = join(root, "levels");
const outDir = join(root, "web", "levels");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const index = [];
for (const id of (await readdir(levelsDir)).sort()) {
  const dir = join(levelsDir, id);
  if (!(await stat(dir)).isDirectory()) continue;
  const meta = JSON.parse(await readFile(join(dir, "level.json"), "utf8"));
  if (meta.id !== id) throw new Error(`${id}: level.json id is "${meta.id}"`);
  if (!CATEGORIES.includes(meta.category)) throw new Error(`${id}: category must be one of ${CATEGORIES.join(", ")}`);

  const filesDir = join(dir, "files");
  const names = (await readdir(filesDir)).sort();
  const sourceName = names.find(n => n === "vuln.c" || n === "vuln.py");
  if (!sourceName) throw new Error(`${id}: files/ needs vuln.c or vuln.py`);
  if (!names.includes("check.sh")) throw new Error(`${id}: files/ needs check.sh`);

  await writeFile(join(outDir, `${id}.json`), JSON.stringify({ ...meta, sourceName }, null, 2));
  index.push({ id, title: meta.title, language: meta.language, category: meta.category, difficulty: meta.difficulty });
  console.log(`built ${id} (${names.join(", ")})`);
}
await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2));

