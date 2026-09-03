import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { minify as minifyJavaScript } from "terser";

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(toolsDirectory, "..");
const excludedDirectories = new Set([".git", "_archive", "node_modules"]);
const assetPattern = /assets\/(?:css|fonts|js)\/[^"'?\s>]+\.(?:css|js)/g;
const preservedBundles = new Set([
  "assets/js/footer.js",
  "assets/js/gclid-capture.js",
  "assets/js/header.js",
]);

async function walk(directory, extension, files = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, extension, files);
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  }
  return files;
}

const htmlFiles = await walk(siteRoot, ".html");
const referencedAssets = new Set();

for (const htmlFile of htmlFiles) {
  const html = await fs.readFile(htmlFile, "utf8");
  for (const match of html.matchAll(assetPattern)) {
    referencedAssets.add(match[0].replace(/\.min\.(css|js)$/, ".$1"));
  }
}

const generatedAssets = new Map();
let preservedAssetCount = 0;
for (const assetPath of [...referencedAssets].sort()) {
  const sourcePath = path.join(siteRoot, assetPath);
  const extension = path.extname(sourcePath);
  const outputPath = sourcePath.slice(0, -extension.length) + `.min${extension}`;
  const minifiedAssetPath =
    assetPath.slice(0, -extension.length) + `.min${extension}`;

  if (preservedBundles.has(assetPath)) {
    await fs.access(outputPath);
    generatedAssets.set(assetPath, minifiedAssetPath);
    preservedAssetCount += 1;
    continue;
  }

  const source = await fs.readFile(sourcePath, "utf8");
  let output;

  if (extension === ".css") {
    const result = new CleanCSS({
      level: 1,
      rebase: false,
      format: false,
    }).minify(source);
    if (result.errors.length) {
      throw new Error(`${assetPath}: ${result.errors.join("; ")}`);
    }
    output = result.styles;
  } else {
    const result = await minifyJavaScript(source, {
      compress: false,
      mangle: false,
      format: { comments: /^!/ },
    });
    if (!result.code) {
      throw new Error(`${assetPath}: JavaScript minification returned no code`);
    }
    output = result.code;
  }

  await fs.writeFile(outputPath, `${output}\n`);
  generatedAssets.set(assetPath, minifiedAssetPath);
}

let updatedHtmlFiles = 0;
let updatedReferences = 0;

for (const htmlFile of htmlFiles) {
  const html = await fs.readFile(htmlFile, "utf8");
  const updated = html.replace(assetPattern, (assetPath) => {
    const sourceAsset = assetPath.replace(/\.min\.(css|js)$/, ".$1");
    const replacement = generatedAssets.get(sourceAsset);
    if (!replacement) return assetPath;
    if (replacement !== assetPath) updatedReferences += 1;
    return replacement;
  });

  if (updated !== html) {
    await fs.writeFile(htmlFile, updated);
    updatedHtmlFiles += 1;
  }
}

console.log(
  `Generated ${generatedAssets.size - preservedAssetCount} minified assets, preserved ${preservedAssetCount} existing bundles, and updated ${updatedReferences} references across ${updatedHtmlFiles} HTML files.`,
);
