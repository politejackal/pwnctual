// Builds what the site serves from /lessons:
//   web/lessons/      lessons/chapters.json and the topic HTML files
//   web/learn/        a ready-made page per topic (/learn/1-1 serves learn/1-1.html),
//                     so search engines and link previews see the lesson without running JavaScript
//   web/sitemap.xml   the home page, every lesson topic and every plain-text copy
//   web/lessons/*.md  a plain-text copy of each topic, for tools that do not run JavaScript
//   web/llms.txt      a description of the site and a list of those copies
//
// lessons/chapters.json lists the chapters and their topics, and each topic is
// an HTML file in lessons/.
//
//   npm run build
import { readFile, writeFile, rm, stat, cp, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const lessonsDir = join(root, "lessons");
const lessonsOut = join(root, "web", "lessons");
const learnOut = join(root, "web", "learn");

await rm(lessonsOut, { recursive: true, force: true });
await rm(learnOut, { recursive: true, force: true });
const chapters = JSON.parse(await readFile(join(lessonsDir, "chapters.json"), "utf8"));
for (const chapter of chapters) for (const topic of chapter.topics) {
  await stat(join(lessonsDir, topic.file)).catch(() => { throw new Error(`lessons/${topic.file} is missing`); });
}
await cp(lessonsDir, lessonsOut, { recursive: true });
console.log(`built ${chapters.reduce((n, c) => n + c.topics.length, 0)} lesson topic(s)`);

// Sitemap for search engines
const urls = ["/", ...chapters.flatMap(c => c.topics.flatMap(t => [`/learn/${t.id}`, `/lessons/${t.file.replace(/\.html$/, ".md")}`]))];
await writeFile(join(root, "web", "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>https://pwnctual.com${u}</loc></url>`).join("\n")}
</urlset>
`);

// Ready-made topic pages: index.html with the lesson already in <main> and its own title,
// description and share tags. The app takes over once its JavaScript runs.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const text = html => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const shell = await readFile(join(root, "web", "index.html"), "utf8");
const all = chapters.flatMap(c => c.topics.map(t => ({ ...t, chapter: c })));
await mkdir(learnOut, { recursive: true });
for (const [i, topic] of all.entries()) {
  const body = await readFile(join(lessonsDir, topic.file), "utf8");
  const num = topic.id.replace("-", ".");
  const title = `${num} ${topic.title} · pwnctual`;
  const url = `https://pwnctual.com/learn/${topic.id}`;
  let desc = text(body.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "");
  if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, "") + "...";
  const link = (t, dir) => t ? `<a class="card lesson-nav ${dir}" href="/learn/${t.id}" data-link>
      <span class="meta">${dir === "prev" ? "Previous" : "Next"}</span>
      <span class="title">${esc(t.id.replace("-", "."))} ${esc(t.title)}</span>
    </a>` : dir === "prev" ? "<span></span>" : "";
  const main = `<div class="page"><header class="page-header">
    <div class="chips"><a class="chip" href="/" data-link>C for hackers</a><span class="chip">Chapter ${topic.chapter.number}: ${esc(topic.chapter.title)}</span></div>
    <h1><span class="topic-num">${num}</span> ${esc(topic.title)}</h1>
  </header>
  ${body.split('<div class="challenge-slot"></div>').map(part => `<article class="lesson">${part}</article>`).join("")}
  <nav class="lesson-navs" aria-label="Topics">${link(all[i - 1], "prev")}${link(all[i + 1], "next")}</nav></div>`;
  const page = shell
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*/g, `$1${esc(desc)}`)
    .replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*/g, `$1${esc(title)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/<noscript id="lesson-copies">[\s\S]*?<\/noscript>\n*/, "")
    .replace('<main id="app" class="wrap" tabindex="-1"></main>', `<main id="app" class="wrap" tabindex="-1" data-prerendered>${main}</main>`);
  if (!page.includes("data-prerendered")) throw new Error("web/index.html has no empty <main id=\"app\"> to fill");
  await writeFile(join(learnOut, `${topic.id}.html`), page);
}
console.log(`pre-rendered ${all.length} topic page(s)`);

// Plain-text copies of the lessons, written as Markdown from the lesson HTML
const parseHtml = html => {
  const root = { kids: [] }, open = [root];
  for (const [token, closing, tag, attrs] of html.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>|[^<]+/g)) {
    if (!tag) open.at(-1).kids.push(token);
    else if (closing) open.pop();
    else { const node = { tag, attrs, kids: [] }; open.at(-1).kids.push(node); open.push(node); }
  }
  return root.kids;
};
const decode = s => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const rawText = node => typeof node === "string" ? decode(node) : node.kids.map(rawText).join("");
const inline = node => {
  if (typeof node === "string") return decode(node).replace(/\s+/g, " ");
  if (/class="icon/.test(node.attrs)) return ""; // an icon's text is its name, not lesson text
  const inner = node.kids.map(inline).join("");
  if (node.tag === "code") return `\`${inner}\``;
  if (node.tag === "b") return `**${inner}**`;
  if (node.tag === "em") return `*${inner}*`;
  return inner;
};
const elements = nodes => nodes.filter(n => typeof n !== "string");
const findAll = (nodes, tag) => elements(nodes).flatMap(n => n.tag === tag ? [n] : findAll(n.kids, tag));
const prefixLines = (s, first, rest) => s.split("\n").map((line, i) => line ? (i ? rest : first) + line : line.trimEnd()).join("\n");
const tableMd = table => {
  const rows = findAll(table.kids, "tr").map(tr => elements(tr.kids).flatMap(cell => {
    const span = Number(cell.attrs.match(/colspan="(\d+)"/)?.[1] ?? 1);
    return [inline(cell).trim().replace(/\|/g, "\\|"), ...Array(span - 1).fill("")];
  }));
  const line = cells => `| ${cells.join(" | ")} |`;
  return [line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n");
};
const blocksMd = nodes => {
  const out = [];
  let run = "";
  const flush = () => { if (run.trim()) out.push(run.trim()); run = ""; };
  for (const node of nodes) {
    if (typeof node === "string" || !["section", "article", "aside", "div", "p", "h2", "h3", "ul", "ol", "table", "pre"].includes(node.tag)) { run += inline(node); continue; }
    flush();
    if (node.tag === "h2") out.push(`## ${inline(node).trim()}`);
    else if (node.tag === "h3") out.push(`### ${inline(node).trim()}`);
    else if (node.tag === "pre") out.push("```\n" + rawText(node).trim() + "\n```");
    else if (node.tag === "table") out.push(tableMd(node));
    else if (node.tag === "ul" || node.tag === "ol") {
      out.push(elements(node.kids).map((li, i) => {
        const marker = node.tag === "ol" ? `${i + 1}. ` : "- ";
        return prefixLines(blocksMd(li.kids).join("\n"), marker, " ".repeat(marker.length));
      }).join("\n"));
    }
    // Side-by-side pieces with no text between them become a list
    else if (/class="(switches|hex-letters)"/.test(node.attrs)) {
      out.push(elements(node.kids).map(item => `- ${item.kids.map(k => inline(k).trim()).filter(Boolean).join(" ")}`).join("\n"));
    }
    else if (node.tag === "aside") out.push(prefixLines(blocksMd(node.kids).join("\n\n"), "> ", "> ").replace(/^$/gm, ">"));
    else out.push(...blocksMd(node.kids));
  }
  flush();
  return out;
};
for (const topic of all) {
  const body = await readFile(join(lessonsDir, topic.file), "utf8");
  const num = topic.id.replace("-", ".");
  const copy = `# ${num} ${topic.title}\n\nChapter ${topic.chapter.number}: ${topic.chapter.title}\nWeb page: https://pwnctual.com/learn/${topic.id}\n\n${blocksMd(parseHtml(body)).join("\n\n")}\n`;
  await writeFile(join(lessonsOut, topic.file.replace(/\.html$/, ".md")), copy);
}
console.log(`wrote ${all.length} plain-text lesson cop${all.length === 1 ? "y" : "ies"}`);

// llms.txt: what the site is and where the plain-text lessons are
for (const topic of all) if (!topic.summary) throw new Error(`lessons/chapters.json: ${topic.id} has no summary`);
await writeFile(join(root, "web", "llms.txt"), `# pwnctual

> Learn C completely from a hacker's perspective. No prior knowledge needed at all. Free and open source.

Each lesson below links to a plain-text copy, followed by a summary and the lesson's web page. The challenges run in the browser, so they are not in the copies.

${chapters.map(c => `## Chapter ${c.number}: ${c.title}

${c.topics.map(t => `- [${t.id.replace("-", ".")} ${t.title}](https://pwnctual.com/lessons/${t.file.replace(/\.html$/, ".md")}): ${t.summary} Web page: https://pwnctual.com/learn/${t.id}`).join("\n")}`).join("\n\n")}
`);

// The home page's list of those copies, for browsers with JavaScript off. Browsers with it on never show this.
const noscript = `<noscript id="lesson-copies">
  <div class="wrap">
    <ul>
${all.map(t => `      <li><a href="/lessons/${t.file.replace(/\.html$/, ".md")}">${esc(t.id.replace("-", "."))} ${esc(t.title)}</a></li>`).join("\n")}
    </ul>
  </div>
</noscript>`;
if (!/<noscript id="lesson-copies">[\s\S]*?<\/noscript>/.test(shell)) throw new Error('web/index.html has no <noscript id="lesson-copies"> to fill');
const home = shell.replace(/<noscript id="lesson-copies">[\s\S]*?<\/noscript>/, () => noscript);
if (home !== shell) await writeFile(join(root, "web", "index.html"), home);
