// Builds what the site serves from /lessons:
//   web/lessons/      lessons/chapters.json and the topic HTML files
//   web/learn/        a ready-made page per topic (/learn/1-1 serves learn/1-1.html),
//                     so search engines and link previews see the lesson without running JavaScript
//   web/sitemap.xml   the home page and every lesson topic
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
const urls = ["/", ...chapters.flatMap(c => c.topics.map(t => `/learn/${t.id}`))];
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
    .replace('<main id="app" class="wrap" tabindex="-1"></main>', `<main id="app" class="wrap" tabindex="-1" data-prerendered>${main}</main>`);
  if (!page.includes("data-prerendered")) throw new Error("web/index.html has no empty <main id=\"app\"> to fill");
  await writeFile(join(learnOut, `${topic.id}.html`), page);
}
console.log(`pre-rendered ${all.length} topic page(s)`);
