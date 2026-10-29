// Builds the contents of the public pwnctual-levels repo, which players open in
// GitHub Codespaces: every level's files/ folder plus a dev container.
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
await writeFile(join(out, ".gitignore"), "# If you build vuln.c yourself, e.g. gcc vuln.c -o vuln\n*/vuln\n");

const levels = [];
for (const id of (await readdir(levelsDir)).sort()) {
  const src = join(levelsDir, id);
  if (!(await stat(src)).isDirectory()) continue;
  const meta = JSON.parse(await readFile(join(src, "level.json"), "utf8"));
  const dest = join(out, id);
  await rm(dest, { recursive: true, force: true });
  // Copies subfolders such as checker/ too, keeping check.sh executable
  await cp(join(src, "files"), dest, { recursive: true, preserveTimestamps: false });
  levels.push(meta);
}

// The levels repo has no README; remove one left over from older builds
await rm(join(out, "README.md"), { force: true });

console.log(`wrote ${levels.length} level(s) to ${out}`);
