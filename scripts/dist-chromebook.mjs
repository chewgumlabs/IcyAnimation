import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(projectRoot, "dist", "chromebook");

const filesToCopy = [
  "index.html",
  "styles.css",
  "app.js",
  "README.md",
  "manifest.webmanifest",
  "sw.js",
  "Sample_Screenshot.png"
];

const directoriesToCopy = ["assets", "stamps"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const relativePath of filesToCopy) {
  await cp(path.join(projectRoot, relativePath), path.join(outputDirectory, relativePath));
}

for (const relativePath of directoriesToCopy) {
  await cp(path.join(projectRoot, relativePath), path.join(outputDirectory, relativePath), {
    recursive: true
  });
}

console.log(`Created Chromebook dist at ${outputDirectory}`);
