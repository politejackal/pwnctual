// Every level the API knows about. To add a level, create its folder under
// /levels and add one entry here.
//
// What the browser may see: id, title, language, difficulty, description,
// hints and the vulnerable source. The tests never leave the Worker.
import greetingMeta from "../../levels/c-01-greeting/level.json";
import greetingSource from "../../levels/c-01-greeting/vulnerable.c";
import greetingTests from "../../levels/c-01-greeting/tests.json";

export type Language = "c" | "python";

// A test string, either written out or generated so huge inputs stay small on disk.
export type TextSpec = string | { prefix?: string; repeat: string; count: number; suffix?: string };

export interface TestCase {
  stdin: TextSpec;
  expected?: TextSpec;
}

export interface LevelTests {
  functional: TestCase[];
  attack: TestCase[];
}

export interface Level {
  id: string;
  title: string;
  language: Language;
  difficulty: string;
  description: string[];
  hints: string[];
  source: string;
  tests: LevelTests;
}

export const LEVELS: Level[] = [
  { ...(greetingMeta as Omit<Level, "source" | "tests">), source: greetingSource, tests: greetingTests },
];

export function findLevel(id: string): Level | undefined {
  return LEVELS.find(l => l.id === id);
}

export function publicLevel(level: Level) {
  const { tests: _hidden, ...rest } = level;
  return rest;
}

export function expandText(spec: TextSpec): string {
  if (typeof spec === "string") return spec;
  return (spec.prefix ?? "") + spec.repeat.repeat(spec.count) + (spec.suffix ?? "");
}
