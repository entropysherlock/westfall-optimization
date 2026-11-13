// Check literal internal hrefs against Next.js App Router pages.
// This is a link-quality gate, not an external HTTP crawler.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve("src");
const app = path.join(root, "app");
const routes = new Set(["/"]);
const sourceFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      sourceFiles.push(p);
      if (entry.name === "page.tsx") {
        const d = path.relative(app, path.dirname(p)).replaceAll(path.sep, "/");
        routes.add(d === "" ? "/" : "/" + d + "/");
      }
    }
  }
}
walk(root);
const issues = [];
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  const regex = /\bhref\s*=\s*["'](\/[^"'?#]*)["']/g;
  for (const m of source.matchAll(regex)) {
    const href = m[1].replace(/\/+$/, "") + "/";
    if (href.startsWith("//")) continue;
    if (!routes.has(href)) {
      issues.push(`${path.relative(root, file)}: broken internal route ${m[1]}`);
    }
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exit(1);
}
console.log(`Verified literal internal links; ${routes.size} routes, ${sourceFiles.length} code files.`);
