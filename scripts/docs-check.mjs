import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve("docs");
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if ([".md", ".mdx"].includes(extname(path))) files.push(path);
  }
}
await walk(root);
const errors = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const [, href] of content.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#|\/)/.test(href)) continue;
    const target = resolve(file, "..", href.split(/[?#]/, 1)[0]);
    try { await readFile(target); } catch { errors.push(`${file}: missing ${href}`); }
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`Checked links in ${files.length} Markdown pages.`);
