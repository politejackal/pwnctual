// The course structure. The site and the server (src/worker.js) both read it.
// To add a chapter, module or lesson, add it here (a lesson also needs its page).
export const COURSE = [
  {
    id: "chapter-1",
    title: "Introduction to computer science",
    description: "Teaches how a computer works, C & Python.",
    video: "W6G73tg4yKs", // YouTube video id, shown on the chapter page
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
        title: "Hello, C",
        lessons: [
          {
            id: "c-syntax",
            title: "C syntax",
            challenge: {
              description: [
                "In this challenge you get a file called `hello.c` that is supposed to print `Hello, World!`, but it has a mistake in it! There are 6 levels, and every level has a different mistake.",
                "Run `/challenge/run`, that spawns `hello.c`. Fix it with `nano hello.c` (save with Ctrl+O and Enter, leave with Ctrl+X), then run `/challenge/run` again to check.",
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
              description: [
                "In this challenge you get a file called `flag.c`, a C program that prints the flag, but nobody has compiled it yet!",
                "Run `/challenge/run`, that spawns `flag.c`. Compile it with `make flag`, then run it with `./flag`, and it prints the flag!",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/compiling",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/compiling",
              flagHash: "d870a7912870de7f647e0a4af5850cd2889a6a152cf0ec260f7f4d31eb4308c3", // SHA-256 of the flag
            },
          },
          {
            id: "variables",
            title: "Variables",
            challenge: {
              description: [
                "In this challenge you get a file called `variables.c`, and the challenge will tell you what to do! There are 6 levels.",
                "Run `/challenge/run`, that spawns `variables.c`, and tells you what to do.",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/variables",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/variables",
              flagHash: "31c11c4f53657bd4bc269231f2a00eed3a059c40b2dd118745d0ceea481e8d46", // SHA-256 of the flag
            },
          },
          {
            id: "math",
            title: "Math",
            challenge: {
              description: [
                "In this challenge you get a file called `math.c`, and the challenge will tell you what to do! The checker tries lots of different values, so your math has to be right every time!",
                "Run `/challenge/run`, that spawns `math.c`, and tells you what to do.",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/math",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/math",
              flagHash: "2e3f2bd2c5633f3c8f1ee81c782a6aa7164acec219cae6a084bf43f06a393396", // SHA-256 of the flag
            },
          },
          {
            id: "conditionals",
            title: "Conditionals",
            challenge: {
              description: [
                "In this challenge you get a file called `conditionals.c`, and the challenge will tell you what to do! Just like before, the checker tries lots of different values, so your conditions have to be right every time!",
                "Run `/challenge/run`, that spawns `conditionals.c`, and tells you what to do.",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/conditionals",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/conditionals",
              flagHash: "bac25ee795cf60c7388a54efba50b48db727c6d256944528ce09621a7f663bfc", // SHA-256 of the flag
            },
          },
          {
            id: "loops",
            title: "Loops",
            challenge: {
              description: [
                "In this challenge you get a file called `loops.c`, and the challenge will tell you what to do! Just like before, the checker tries lots of different values, so your loops have to be right every time!",
                "Run `/challenge/run`, that spawns `loops.c`, and tells you what to do.",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/loops",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/loops",
              flagHash: "d2233d76de6ca399cd934dfe4594ce52bc3101b82de337d841dac53823c91be0", // SHA-256 of the flag
            },
          },
          {
            id: "functions",
            title: "Functions",
            challenge: {
              description: [
                "In this challenge you get a file called `hello.c`, and the challenge will tell you what to do! There are 5 levels.",
                "Run `/challenge/run`, that spawns `hello.c`, and tells you what to do.",
              ],
              command: "docker run --rm -it ghcr.io/pwnctual/functions",
              leave: "exit",
              cleanup: "docker rmi ghcr.io/pwnctual/functions",
              flagHash: "18e916d481325d974370769c1b019d6f8bb13dc87e6b23ebecaeea8f451896ce", // SHA-256 of the flag
            },
          },
        ],
      },
    ],
  },
];
