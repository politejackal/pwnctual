// The course structure. The site and the server (src/worker.js) both read it.
// To add a chapter, module or lesson, add it here (a lesson also needs its page).
export const COURSE = [
  {
    id: "chapter-1",
    title: "Introduction to computer science",
    description: "Teaches how a computer works, C & Python.",
    modules: [
      {
        id: "binary-and-data-representation",
        title: "Binary & data representation",
        lessons: [
          {
            id: "reading-the-computers-language",
            title: "Reading the computer's language",
            challenge: {
              command: "docker run --rm -it ghcr.io/pwnctual/reading-the-computers-language",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/reading-the-computers-language",
              flagHash: "fcb17f702f3271783e441b2d6f67bdec42b7cbbd4657abb981f39bb41878e009", // SHA-256 of the flag
            },
          },
          {
            id: "writing-the-computers-language",
            title: "Writing the computer's language",
            challenge: {
              command: "docker run --rm -it ghcr.io/pwnctual/writing-the-computers-language",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/writing-the-computers-language",
              flagHash: "3270c971f083d1775a3167dcd7b04ff711c4e299e780ce5af00e871bdaa2a5eb", // SHA-256 of the flag
            },
          },
          {
            id: "how-is-binary-used",
            title: "How data is represented",
          },
        ],
      },
      {
        id: "computational-thinking",
        title: "Computational thinking",
        lessons: [
          {
            id: "thinking-like-a-computer",
            title: "Thinking like a computer",
          },
          {
            id: "algorithms",
            title: "Algorithms",
          },
          {
            id: "pseudocode",
            title: "Pseudocode",
          },
          {
            id: "core-programming-concepts",
            title: "Core programming concepts",
          },
        ],
      },
      {
        id: "c",
        title: "C",
        lessons: [
          {
            id: "c-syntax",
            title: "C syntax",
            challenge: {
              description: [
                "I know it feels fuzzy, but fixing and writing code is a great way to remove that fuzzy feeling.",
                "In this challenge, you will be fixing a broken C program. You get a file called `hello.c` that is supposed to print `Hello, World!`, but it has a mistake in it. Your job is to find that mistake and fix it. There are 6 levels, and every level has a different mistake.",
                "Here's how it works: run the first command below, then run `/challenge/run`. That gives you `hello.c`. Open it with `nano hello.c`, fix the mistake, save it with Ctrl+O and Enter, and leave with Ctrl+X. Now run `/challenge/run` again to check your fix. If it's right, you move on to the next level. Fix all 6 and you get the flag. Paste it in the box below, and that's it!",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/c-syntax",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/c-syntax",
              flagHash: "b2e5120e065f6094367691fb162a1d03583deefbac324adb2cde28ea2f2c5327", // SHA-256 of the flag
            },
          },
          {
            id: "compiling",
            title: "Compiling",
            challenge: {
              command: "docker run --rm -it ghcr.io/pwnctual/compiling",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/compiling",
              flagHash: "d870a7912870de7f647e0a4af5850cd2889a6a152cf0ec260f7f4d31eb4308c3", // SHA-256 of the flag
            },
          },
        ],
      },
    ],
  },
];
