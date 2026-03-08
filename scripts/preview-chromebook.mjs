import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(projectRoot, "dist", "chromebook");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

function getPort() {
  const portFlag = process.argv.find((argument) => argument.startsWith("--port="));
  const rawPort = portFlag ? portFlag.slice("--port=".length) : process.env.PORT ?? "4174";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${rawPort}`);
  }

  return port;
}

async function buildChromebookDist() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(scriptDirectory, "dist-chromebook.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Chromebook build failed with exit code ${code ?? "unknown"}.`));
    });
  });
}

function resolveRequestPath(urlPathname) {
  const decodedPath = decodeURIComponent(urlPathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(distDirectory, relativePath);

  if (!filePath.startsWith(distDirectory + path.sep) && filePath !== path.join(distDirectory, "index.html")) {
    return null;
  }

  return filePath;
}

async function getResponseFile(urlPathname) {
  const directPath = resolveRequestPath(urlPathname);
  if (!directPath) {
    return null;
  }

  try {
    const directStat = await stat(directPath);
    if (directStat.isDirectory()) {
      return path.join(directPath, "index.html");
    }
    return directPath;
  } catch {
    return path.join(distDirectory, "index.html");
  }
}

async function startServer() {
  const port = getPort();

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const filePath = await getResponseFile(requestUrl.pathname);

      if (!filePath) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const fileContents = await readFile(filePath);
      const extension = path.extname(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": mimeTypes.get(extension) ?? "application/octet-stream"
      });
      response.end(fileContents);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Preview server error");
      console.error(error);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const previewUrl = `http://127.0.0.1:${port}`;
  console.log("");
  console.log(`Chromebook preview ready at ${previewUrl}`);
  console.log("Open that URL in Chrome, then use the install button or Chrome's install control.");
  console.log("Press Ctrl+C to stop the preview server.");

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

await buildChromebookDist();
await startServer();
