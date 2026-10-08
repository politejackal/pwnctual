// The course. To add a chapter, add it to a module's `chapters` below.
//
// Hierarchy:  Module  ->  Chapter  ->  Challenge
//
// Chapter 0 (INTRO) sits on its own before the modules. A chapter can have a YouTube
// lecture, a writeup, and challenges hosted on outside practice sites such as
// OverTheWire, or done on your own machine. Any of these can be missing: Chapter 0 is
// just a video, and some chapters are just a writeup. Nothing is auto-checked: when a
// learner says they finished a challenge, we take their word for it.
//
// Chapter fields:
//   id             stable id (chapter URLs are /learn/chapter-<number>)
//   title, summary
//   notes          the writeup, as HTML; "" for none
//   notesOptional  say under the Writeup heading that reading it can be skipped
//   videoId        YouTube video ID of the lecture; "" while it's being made
//   hasLecture     false for a chapter that is writeup-only on purpose: no "coming soon"
//   challenges     [{ slug, title, url, brief, platform = "OverTheWire", details (HTML) }]
//                  url is empty for a challenge done on your own machine;
//                  brief is one line on what the level is about, never the answer.

const INTRO_CHAPTER = {
  id: "welcome",
  title: "Welcome to pwnctual, what is it tho?",
  videoId: "X33z5PtCT4Y",
};

const GETTING_LINUX = {
  id: "getting-linux",
  title: "Getting Linux",
  hasLecture: false,
  notes: `
<p>Before anything else, you need a Linux terminal to play in. Don't worry, you
don't have to format your computer or buy a new one. Pick the section for the
machine you're on, follow it, and you're done.</p>

<h3>On Windows</h3>
<p>Windows has a built-in way to run real Linux right inside it, called <strong>WSL</strong>
(Windows Subsystem for Linux). Nothing extra needed.</p>
<p><strong>Step 1.</strong> Click the Start button, type <code>PowerShell</code>, right-click it and choose
<strong>Run as administrator</strong>.</p>
<p><strong>Step 2.</strong> Type this and press Enter:</p>
<pre><code>wsl --install
</code></pre>
<p><strong>Step 3.</strong> Wait for it to finish, then restart your computer if it asks.</p>
<p><strong>Step 4.</strong> After the restart, open the Start menu, search for <strong>Ubuntu</strong> and
open it.</p>
<p><strong>Step 5.</strong> It will ask you to pick a username and a password. When you type the
password, nothing shows up on the screen, not even dots. That's alright.</p>
<p>That's it, you now have a Linux terminal on Windows!</p>
<p>This needs Windows 10 (version 2004 or newer) or Windows 11. Just google if this
doesn't work for you.</p>

<h3>On a Mac</h3>
<p>It's a bit different. I never had the luxury to use a Mac in my life, so I am
not really sure how it is, but you can just use a cloud terminal like GitHub
Codespaces, or make a virtual machine to run real Linux. Just google it,
awesome!</p>

<h3>On Linux</h3>
<p>Well, it's dumb to say the steps, so just open your terminal. 🙂 On Ubuntu and
many other versions of Linux, the shortcut is <code>Ctrl + Alt + T</code>. If that doesn't
work, search for "Terminal" in your apps.</p>
`,
};

const WELCOME_TO_THE_TERMINAL = {
  id: "welcome-to-the-terminal",
  title: "Welcome to the Terminal",
  notesOptional: true,
  notes: `
<h3>The Terminal</h3>
<p>In <code>politejackal@acer:~$</code>:</p>
<ul>
<li><code>politejackal</code> is my account name.</li>
<li><code>@</code> is just a separator, like in "device/machine", where the <code>/</code> separates the
  two words :)</li>
<li><code>acer</code> is my device/machine name, which I put in when setting up my device
  after I bought it.</li>
<li><code>:</code> is just another separator.</li>
<li>We will come back in a bit to what the <code>~</code> means. It's nothing complicated,
  though!</li>
<li>The <code>$</code> symbol basically tells you that the terminal is ready for the next
  command.</li>
</ul>

<h3>What Is a Command?</h3>
<p>Well, a command is just a bunch of code which is defined on your machine, and
whenever you call it, you are invoking the command. Simple! Soon you will be
building your own commands!</p>
<p>You invoke a command just by using its name, for example <code>ls</code>, <code>touch</code>, etc.
You don't need to know what these mean for now.</p>
<p>Most commands follow a simple syntax. You don't need to memorize this; just take
it as a simple overview for now. You will learn by doing it yourself on the way.</p>
<pre><code>command -flags arguments
</code></pre>
<p>Example: <code>ls -a /home</code>. Like hell you need to know what all of these are for
now; this is just to give you an idea.</p>

<h3>Case Sensitivity</h3>
<p>Everything in the terminal is case sensitive. <code>Documents</code> and <code>documents</code> are
two completely different things to the terminal, just like <code>home</code> and
<code>ifebgiefihnwufhwi</code>.</p>
`,
};

const MODULE_LIST = [
  {
    id: "linux-basics",
    title: "Linux Basics",
    summary: "The terminal, SSH, and finding your way around a Linux box.",
    chapters: [GETTING_LINUX, WELCOME_TO_THE_TERMINAL],
  },
];

// ------------------------------------------------------------------ registry

const TONES = ["primary", "tertiary", "secondary"];

function chapter(c) {
  return { summary: "", notes: "", notesOptional: false, videoId: "", hasLecture: true, ...c,
    challenges: (c.challenges || []).map((x) => ({ platform: "OverTheWire", url: "", details: "", ...x })) };
}

export const INTRO = INTRO_CHAPTER ? chapter(INTRO_CHAPTER) : null;
export const MODULES = MODULE_LIST.map((m, i) => ({
  ...m, number: i + 1, tone: TONES[(i + 1) % 3], chapters: m.chapters.map(chapter),
}));

// Numbered from 0 straight through the modules, so chapter numbers never reset.
export const CHAPTERS = [...(INTRO ? [INTRO] : []), ...MODULES.flatMap((m) => m.chapters)];
export const MODULE_BY_ID = {};
export const CHAPTER_BY_ID = {};
export const CHAPTER_BY_SLUG = {};
export const CHALLENGES = {};

for (const m of MODULES) {
  if (MODULE_BY_ID[m.id]) throw new Error(`duplicate module id: ${m.id}`);
  MODULE_BY_ID[m.id] = m;
  for (const ch of m.chapters) ch.module = m;
  m.challenges = m.chapters.flatMap((ch) => ch.challenges);
}

CHAPTERS.forEach((ch, i) => {
  ch.number = i;
  ch.slug = `chapter-${i}`;
  ch.url = `/learn/${ch.slug}`;
  if (CHAPTER_BY_ID[ch.id]) throw new Error(`duplicate chapter id: ${ch.id}`);
  CHAPTER_BY_ID[ch.id] = ch;
  CHAPTER_BY_SLUG[ch.slug] = ch;
  ch.videoUrl = ch.videoId ? `https://www.youtube.com/watch?v=${ch.videoId}` : "";
  // where "Stuck?" sends people: this lecture, or Chapter 0's until it has one
  ch.helpVideoId = ch.videoId || CHAPTERS[0].videoId || "";
  ch.helpVideoUrl = `https://www.youtube.com/watch?v=${ch.helpVideoId}`;
  for (const c of ch.challenges) {
    c.chapter = ch;
    if (CHALLENGES[c.slug]) throw new Error(`duplicate challenge slug: ${c.slug}`);
    CHALLENGES[c.slug] = c;
  }
});

if (CHAPTERS.length && !CHAPTERS[0].videoId) {
  throw new Error("Chapter 0 needs a video: it's where Stuck? sends people for chapters without one");
}
// Modules and chapters share /learn/<id>, so module ids can't overlap chapter ids or slugs.
for (const id of Object.keys(MODULE_BY_ID)) {
  if (CHAPTER_BY_ID[id] || CHAPTER_BY_SLUG[id]) throw new Error(`module and chapter share an id: ${id}`);
}

export const TOTAL_CHALLENGES = Object.keys(CHALLENGES).length;
