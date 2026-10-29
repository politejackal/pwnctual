// Builds what the site serves for each level in /levels:
//   web/levels/index.json   list of levels (for the path pages)
//   web/levels/<id>.json    level.json plus the vulnerable source (for the level page)
//   web/levels/<id>.zip     everything in levels/<id>/files, inside a <id>/ folder
//
//   npm run build:levels
import { readdir, readFile, writeFile, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { deflateRawSync, crc32 } from "node:zlib";

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

  const filesDir = join(dir, "files");
  const names = (await readdir(filesDir)).sort();
  const sourceName = names.find(n => n === "vuln.c" || n === "vuln.py");
  if (!sourceName) throw new Error(`${id}: files/ needs vuln.c or vuln.py`);
  if (!names.includes("check.sh")) throw new Error(`${id}: files/ needs check.sh`);

  const entries = [];
  for (const name of names) {
    const path = join(filesDir, name);
    const info = await stat(path);
    // check.sh keeps its executable bit inside the zip
    entries.push({ name: `${id}/${name}`, data: await readFile(path), mode: info.mode & 0o111 ? 0o755 : 0o644 });
  }
  await writeFile(join(outDir, `${id}.zip`), makeZip(entries));

  const source = await readFile(join(filesDir, sourceName), "utf8");
  await writeFile(join(outDir, `${id}.json`), JSON.stringify({ ...meta, sourceName, source }, null, 2));
  index.push({ id, title: meta.title, language: meta.language, difficulty: meta.difficulty });
  console.log(`built ${id} (${names.join(", ")})`);
}
await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2));

// Minimal zip writer: deflate, Unix permissions, fixed timestamp so rebuilds are identical.
function makeZip(files) {
  const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 1 << 5 | 1; // 2026-01-01 00:00
  const local = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const compressed = deflateRawSync(f.data, { level: 9 });
    const crc = crc32(f.data);

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);           // version needed
    header.writeUInt16LE(0x0800, 6);       // UTF-8 names
    header.writeUInt16LE(8, 8);            // deflate
    header.writeUInt16LE(DOS_TIME, 10);
    header.writeUInt16LE(DOS_DATE, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(f.data.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(3 << 8 | 20, 4);  // made by Unix, so the permissions below count
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(DOS_TIME, 12);
    entry.writeUInt16LE(DOS_DATE, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(f.data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(((0o100000 | f.mode) << 16) >>> 0, 38); // regular file + mode
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);

    offset += header.length + name.length + compressed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBuf, end]);
}
