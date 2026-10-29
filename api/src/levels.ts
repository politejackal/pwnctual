// Every level the site shows. To add a level, create its folder under /levels,
// copy it to the runner VM (with its tests), and add one entry here.
//
// Only what players may see is bundled into the Worker: id, title, language,
// difficulty, description, hints and the vulnerable source. Tests live on the runner.
import greetingMeta from "../../levels/c-01-greeting/level.json";
import greetingSource from "../../levels/c-01-greeting/vulnerable.c";

export type Language = "c" | "python";

export interface Level {
  id: string;
  title: string;
  language: Language;
  difficulty: string;
  description: string[];
  hints: string[];
  source: string;
}

export const LEVELS: Level[] = [
  { ...(greetingMeta as Omit<Level, "source">), source: greetingSource },
];

export function findLevel(id: string): Level | undefined {
  return LEVELS.find(l => l.id === id);
}
