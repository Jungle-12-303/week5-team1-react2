import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const rootDir = resolve(currentDir, "..");
const srcDir = resolve(rootDir, "src");
const distDir = resolve(rootDir, "dist");

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await cp(resolve(srcDir, "core"), resolve(distDir, "core"), { recursive: true });
  await copyFile(resolve(srcDir, "index.js"), resolve(distDir, "index.js"));
  console.log("Built library files into dist/.");
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
