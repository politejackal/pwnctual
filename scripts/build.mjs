// Builds what the site serves from /lessons:
//   web/lessons/      lessons/chapters.json and the topic HTML files
//   web/sitemap.xml   the home page and every lesson topic
//
// lessons/chapters.json lists the chapters and their topics, and each topic is
// an HTML file in lessons/.
//
//   npm run build
import { readFile, writeFile, rm, stat, cp } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const lessonsDir = join(root, "lessons");
const lessonsOut = join(root, "web", "lessons");

await rm(lessonsOut, { recursive: true, force: true });
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
