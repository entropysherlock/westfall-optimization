/** Stable anchor for a heading: "4. Counting cuts in nearly complete digraphs" -> "4-counting-cuts-in-nearly-complete-digraphs". */
export function slug(text: string) {
  return text.toLowerCase().replace(/[$\\{}^_]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
