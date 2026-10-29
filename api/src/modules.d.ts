// Level sources are imported as text (see "rules" in wrangler.jsonc).
declare module "*.c" {
  const source: string;
  export default source;
}
declare module "*.py" {
  const source: string;
  export default source;
}
