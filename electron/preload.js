const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("icyDesktop", {
  isDesktop: true,
  saveFile: (options) => ipcRenderer.invoke("icy:save-file", options),
  saveFilesToDirectory: (options) => ipcRenderer.invoke("icy:save-files-to-directory", options),
  openProjectFile: () => ipcRenderer.invoke("icy:open-project-file"),
});
