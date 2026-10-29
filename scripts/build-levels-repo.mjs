// Builds the contents of the public pwnctual-levels repo, which players open in
// GitHub Codespaces. It gets every level's files/ folder plus a dev container.
//
//   node scripts/build-levels-repo.mjs [output dir]     (default: ../pwnctual-levels)
//
// Only replaces what it generates, so the output folder can stay a git checkout.
import { readdir, readFile, writeFile, mkdir, rm, stat, copyFile, chmod } from "node:fs/promises";
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
    codespaces: { openFiles: ["README.md"] },
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
await writeFile(join(out, ".gitignore"), "# Built by make / check.sh\n*/vuln\n*/build.log\n");

const levels = [];
for (const id of (await readdir(levelsDir)).sort()) {
  const src = join(levelsDir, id);
  if (!(await stat(src)).isDirectory()) continue;
  const meta = JSON.parse(await readFile(join(src, "level.json"), "utf8"));
  const dest = join(out, id);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest);
  for (const name of await readdir(join(src, "files"))) {
    await copyFile(join(src, "files", name), join(dest, name));
    await chmod(join(dest, name), (await stat(join(src, "files", name))).mode & 0o777);
  }
  levels.push(meta);
}

const langName = { c: "C", python: "Python" };
await writeFile(join(out, "README.md"), `# pwnctual levels

Every folder here is one level from [pwnctual](https://pwnctual.pages.dev): a small program with a
security bug for you to fix.

## How to play

1. Open the folder for your level in the file list on the left.
2. Read what the level is about on its page on pwnctual, then fix the bug in \`vuln.c\`
   (or \`vuln.py\`).
3. Open a terminal (**Terminal → New Terminal**) and run the check:

   \`\`\`bash
   cd c-01-greeting
   ./check.sh
   \`\`\`

4. When it prints **PASS**, go back to the level page on pwnctual and tick **I solved it**.

Your changes stay in this codespace. If you close it, open it again from the level page or from
[github.com/codespaces](https://github.com/codespaces) and carry on where you left off.

## Levels

| Level | Folder | Language | Difficulty |
| --- | --- | --- | --- |
${levels.map(l => `| [${l.title}](https://pwnctual.pages.dev/level/${l.id}) | \`${l.id}/\` | ${langName[l.language] ?? l.language} | ${l.difficulty} |`).join("\n")}

## Without Codespaces

Every level is also a download on its page on pwnctual, if you'd rather work on your own
computer. The level pages cover the setup for Linux, macOS and Windows (WSL).
`);

console.log(`wrote ${levels.length} level(s) to ${out}`);
