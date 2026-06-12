import express from "express";
import path from "path";

const BLOCKED_PREFIXES = [
  "/.",
  "/server",
  "/node_modules",
  "/server.js",
  "/package.json",
  "/package-lock.json",
  "/README.md",
  "/.env",
];

const BLOCKED_EXACT = new Set([
  "/server.js",
  "/package.json",
  "/package-lock.json",
  "/README.md",
  "/.env",
  "/.env.example",
  "/.gitignore",
]);

function isBlockedPath(requestPath) {
  const normalized = requestPath.toLowerCase();

  if (BLOCKED_EXACT.has(normalized)) {
    return true;
  }

  if (BLOCKED_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  if (normalized.includes("/.") || normalized.includes(".env")) {
    return true;
  }

  return false;
}

export function blockSensitivePaths(req, res, next) {
  if (isBlockedPath(req.path)) {
    return res.status(404).end();
  }

  next();
}

export function createPublicStatic(rootDir) {
  const staticOptions = {
    dotfiles: "deny",
    index: false,
    setHeaders(res, filePath) {
      if (/\.(html?|js|css)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  };

  return {
    css: express.static(path.join(rootDir, "css"), staticOptions),
    js: express.static(path.join(rootDir, "js"), staticOptions),
  };
}

export function registerPublicRoutes(app, rootDir) {
  const publicStatic = createPublicStatic(rootDir);

  app.use(blockSensitivePaths);
  app.use("/css", publicStatic.css);
  app.use("/js", publicStatic.js);

  app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"), {
      headers: { "Cache-Control": "no-store" },
    });
  });

  app.use((req, res) => {
    if (isBlockedPath(req.path)) {
      return res.status(404).end();
    }

    return res.status(404).end();
  });
}
