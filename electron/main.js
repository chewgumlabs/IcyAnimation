const path = require("path");
const fs = require("fs/promises");
const { app, BrowserWindow, dialog, ipcMain, session } = require("electron");

let mainWindow = null;

function getMainWindowFromSender(sender) {
  return BrowserWindow.fromWebContents(sender) ?? mainWindow ?? undefined;
}

function normalizeDialogFilters(filters) {
  if (!Array.isArray(filters)) {
    return [];
  }

  return filters
    .map((filter) => ({
      name: typeof filter?.name === "string" && filter.name.trim() ? filter.name : "Files",
      extensions: Array.isArray(filter?.extensions)
        ? filter.extensions
            .map((extension) => String(extension).trim().replace(/^\./, ""))
            .filter(Boolean)
        : [],
    }))
    .filter((filter) => filter.extensions.length > 0);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 920,
    minWidth: 1040,
    minHeight: 760,
    backgroundColor: "#466f9f",
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && navigationUrl !== currentUrl) {
      event.preventDefault();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("icy:save-file", async (event, payload = {}) => {
  const browserWindow = getMainWindowFromSender(event.sender);
  const suggestedName =
    typeof payload.suggestedName === "string" && payload.suggestedName.trim()
      ? path.basename(payload.suggestedName)
      : "icyanimation-file";
  const filters = normalizeDialogFilters(payload.filters);

  const result = await dialog.showSaveDialog(browserWindow, {
    defaultPath: suggestedName,
    filters: filters.length > 0 ? filters : undefined,
  });

  if (result.canceled || !result.filePath) {
    return {
      canceled: true,
    };
  }

  await fs.writeFile(result.filePath, Buffer.from(payload.bytes ?? new ArrayBuffer(0)));
  return {
    canceled: false,
    filePath: result.filePath,
    name: path.basename(result.filePath),
  };
});

ipcMain.handle("icy:save-files-to-directory", async (event, payload = {}) => {
  const browserWindow = getMainWindowFromSender(event.sender);
  const result = await dialog.showOpenDialog(browserWindow, {
    title: "Choose Export Folder",
    defaultPath:
      typeof payload.suggestedDirectoryName === "string" && payload.suggestedDirectoryName.trim()
        ? payload.suggestedDirectoryName
        : undefined,
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return {
      canceled: true,
      count: 0,
    };
  }

  const targetDirectory = result.filePaths[0];
  const files = Array.isArray(payload.files) ? payload.files : [];

  await Promise.all(
    files.map((file) => {
      const safeName =
        typeof file?.name === "string" && file.name.trim() ? path.basename(file.name) : "file.bin";
      return fs.writeFile(path.join(targetDirectory, safeName), Buffer.from(file.bytes ?? new ArrayBuffer(0)));
    })
  );

  return {
    canceled: false,
    count: files.length,
    directoryPath: targetDirectory,
  };
});

ipcMain.handle("icy:open-project-file", async (event) => {
  const browserWindow = getMainWindowFromSender(event.sender);
  const result = await dialog.showOpenDialog(browserWindow, {
    title: "Open IcyAnimation Project or Room",
    properties: ["openFile"],
    filters: [
      {
        name: "IcyAnimation Projects",
        extensions: ["icy", "room", "Room", "Parchment", "SpecialKey"],
      },
      {
        name: "JSON Files",
        extensions: ["json"],
      },
    ],
  });

  const filePath = result.filePaths?.[0];
  if (result.canceled || !filePath) {
    return {
      canceled: true,
    };
  }

  return {
    canceled: false,
    name: path.basename(filePath),
    text: await fs.readFile(filePath, "utf8"),
  };
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
