// Builds the contents of the public pwnctual-levels repo, which players open in
// GitHub Codespaces: a learning/ and a finding/ folder with every level's files,
// plus a dev container.
//
//   node scripts/build-levels-repo.mjs [output dir]     (default: ../pwnctual-levels)
//
// Only replaces what it generates, so the output folder can stay a git checkout.
import { readdir, readFile, writeFile, mkdir, rm, stat, cp } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const out = resolve(process.argv[2] ?? join(root, "..", "pwnctual-levels"));
const levelsDir = join(root, "levels");

const devcontainer = {
  name: "pwnctual",
  // gcc, gdb and make on Ubuntu 24.04. AddressSanitizer works out of the box.
  image: "mcr.microsoft.com/devcontainers/cpp:1-ubuntu-24.04",
  hostRequirements: { cpus: 2 },
  postCreateCommand: "command -v python3 >/dev/null || (sudo apt-get update && sudo apt-get install -y python3)",
  customizations: {
    vscode: {
      extensions: ["ms-vscode.cpptools"],
      settings: { "files.trimTrailingWhitespace": false, "terminal.integrated.defaultProfile.linux": "bash" },
    },
  },
};

await mkdir(out, { recursive: true });
await rm(join(out, ".devcontainer"), { recursive: true, force: true });
await mkdir(join(out, ".devcontainer"));
await writeFile(join(out, ".devcontainer", "devcontainer.json"), JSON.stringify(devcontainer, null, 2) + "\n");
await writeFile(join(out, ".gitignore"), "# Built by check.sh\n**/vuln\n");

// Levels used to sit at the top of the repo; remove those
for (const name of await readdir(out)) {
  if (/^[a-z]+-\d\d-/.test(name)) await rm(join(out, name), { recursive: true, force: true });
}

const levels = [];
for (const path of ["learning", "finding"]) {
  await rm(join(out, path), { recursive: true, force: true });
  await mkdir(join(out, path));
  for (const id of (await readdir(join(levelsDir, path))).sort()) {
    const src = join(levelsDir, path, id);
    if (!(await stat(src)).isDirectory()) continue;
    const meta = JSON.parse(await readFile(join(src, "level.json"), "utf8"));
    // Keeps check.sh executable
    await cp(join(src, "files"), join(out, path, id), { recursive: true, preserveTimestamps: false });
    levels.push(meta);
  }
  // Git doesn't keep empty folders
  if (!(await readdir(join(out, path))).length) await writeFile(join(out, path, ".gitkeep"), "");
}

// The levels repo has no README; remove one left over from older builds
await rm(join(out, "README.md"), { force: true });

console.log(`wrote ${levels.length} level(s) to ${out}`);
