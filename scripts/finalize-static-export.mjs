import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientOutput = path.join(projectRoot, "dist", "client");

// Vinext currently prerenders non-root routes only when trailingSlash is false.
// Duplicate the generated document into a directory index so static hosts such
// as GitHub Pages can serve the canonical, extension-free `/media-kit/` URL.
const cleanRoutes = ["media-kit"];

await Promise.all(cleanRoutes.map(async (route) => {
  const routeDirectory = path.join(clientOutput, ...route.split("/"));
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(
    path.join(clientOutput, `${route}.html`),
    path.join(routeDirectory, "index.html"),
  );
}));

