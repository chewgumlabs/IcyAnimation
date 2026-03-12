const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 192;
const LAYER_COUNT = 3;
const STAMP_IMPORT_MAX_WIDTH = Math.floor(SCREEN_WIDTH / 3);
const STAMP_IMPORT_MAX_HEIGHT = Math.floor(SCREEN_HEIGHT / 3);

const palette = [
  { name: "Soot", hex: "#17191d" },
  { name: "Tangerine", hex: "#ef8f50" },
  { name: "Sky", hex: "#4d9fe7" },
  { name: "Mint", hex: "#2db8a1" },
  { name: "Rose", hex: "#de6a8b" },
  { name: "Sun", hex: "#f5c74e" },
];

const noteColors = [
  { id: "sun", label: "Sun", fill: "#f6d35a", accent: "#ef8f50" },
  { id: "mint", label: "Mint", fill: "#cee6c4", accent: "#2db8a1" },
  { id: "sky", label: "Sky", fill: "#d4e3f8", accent: "#4d9fe7" },
  { id: "rose", label: "Rose", fill: "#f1d1db", accent: "#de6a8b" },
  { id: "paper", label: "Paper", fill: "#f1ead9", accent: "#8d7654" },
];

const defaultStampSources = [
  { label: "Chew 1", src: "./stamps/Chew.png" },
  { label: "Chew 2", src: "./stamps/Chew2.png" },
  { label: "Chew 3", src: "./stamps/Chew3.png" },
  { label: "Chew 4", src: "./stamps/Chew4.png" },
  { label: "Chew 5", src: "./stamps/Chew5.png" },
];

const presetCatalog = {
  title: { label: "Title", overlay: false, writable: false },
  note: { label: "Note", overlay: true, writable: true },
  stamp: { label: "Stamp", overlay: true, writable: false },
  connector: { label: "Connector", overlay: false, writable: false },
};

const state = {
  frames: [],
  backgroundClips: [],
  backgroundAssignments: [],
  currentFrameIndex: 0,
  activeLayerIndex: 0,
  brushSize: 1,
  tool: "pen",
  activePreset: "note",
  activeNoteColor: noteColors[0].id,
  stampScale: 1,
  stamps: [],
  activeStampId: null,
  selectedObjectId: null,
  isPlaying: false,
  fps: 12,
  onionSkin: true,
  soloTrack: null,
  editTarget: "frame",
  layerVisibility: [true, true, true],
  layerPaletteIndexes: [0, 1, 2],
};

const pointerState = {
  active: false,
  mode: null,
  tool: "pen",
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  lastX: 0,
  lastY: 0,
  dragOffsetX: 0,
  dragOffsetY: 0,
  objectId: null,
  endpointName: null,
  lassoPoints: [],
  inkContext: null,
  inkOffsetX: 0,
  inkOffsetY: 0,
  hoverX: 0,
  hoverY: 0,
  hasHover: false,
};

const selectionState = {
  active: false,
  targetType: "frame",
  targetId: null,
  layerIndex: -1,
  canvas: null,
  bounds: null,
  offsetX: 0,
  offsetY: 0,
};

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const tintCanvas = document.createElement("canvas");
tintCanvas.width = SCREEN_WIDTH;
tintCanvas.height = SCREEN_HEIGHT;
const tintContext = tintCanvas.getContext("2d");
tintContext.imageSmoothingEnabled = false;

const displayCanvas = document.querySelector("#display");
const displayContext = displayCanvas.getContext("2d");
displayContext.imageSmoothingEnabled = false;
const desktopApi = globalThis.icyDesktop ?? null;
const installAppButton = document.querySelector("#installAppButton");
const statusLine = document.querySelector("#statusLine");
const roomModeBadge = document.querySelector("#roomModeBadge");

const stampTray = document.querySelector("#stampTray");
const editModeLabel = document.querySelector("#editModeLabel");
const frameReadout = document.querySelector("#frameReadout");
const prevFrameButton = document.querySelector("#prevFrameButton");
const nextFrameButton = document.querySelector("#nextFrameButton");
const playButton = document.querySelector("#playButton");
const onionToggle = document.querySelector("#onionToggle");
const fpsButtons = [...document.querySelectorAll(".fps-button")];
const layersPanel = document.querySelector("#layersPanel");
const timeline = document.querySelector("#timeline");
const backgroundTimeline = document.querySelector("#backgroundTimeline");
const timelinePanel = document.querySelector(".timeline-panel");
const framesPanel = document.querySelector(".frames-panel");
const backgroundPanel = document.querySelector(".background-panel");
const backgroundActionsPanel = document.querySelector(".background-actions-panel");
const roomModeBackgroundNotice = document.querySelector("#roomModeBackgroundNotice");
const soloDrawingsButton = document.querySelector("#soloDrawingsButton");
const soloBackgroundTrackButton = document.querySelector("#soloBackgroundTrackButton");
const newFrameButton = document.querySelector("#newFrameButton");
const duplicateFrameButton = document.querySelector("#duplicateFrameButton");
const deleteFrameButton = document.querySelector("#deleteFrameButton");
const clearFrameButton = document.querySelector("#clearFrameButton");
const newBackgroundButton = document.querySelector("#newBackgroundButton");
const splitBackgroundButton = document.querySelector("#splitBackgroundButton");
const holdBackgroundButton = document.querySelector("#holdBackgroundButton");
const clearBackgroundButton = document.querySelector("#clearBackgroundButton");
const exportFrameButton = document.querySelector("#exportFrameButton");
const exportAllFramesButton = document.querySelector("#exportAllFramesButton");
const exportGifButton = document.querySelector("#exportGifButton");
const toolButtons = [...document.querySelectorAll(".tool-button")];
const brushButtons = [...document.querySelectorAll(".brush-button")];
const presetButtons = [...document.querySelectorAll(".preset-button")];
const stampScaleButtons = [...document.querySelectorAll(".stamp-scale-button")];
const addStampButton = document.querySelector("#addStampButton");
const replaceStampButton = document.querySelector("#replaceStampButton");
const addStampInput = document.querySelector("#addStampInput");
const replaceStampInput = document.querySelector("#replaceStampInput");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const continueProjectButton = document.querySelector("#continueProjectButton");
const saveProjectButton = document.querySelector("#saveProjectButton");
const openProjectButton = document.querySelector("#openProjectButton");
const openProjectInput = document.querySelector("#openProjectInput");
const noteColorPanel = document.querySelector("#noteColorPanel");
const rainbowPanelHeadings = new Set([
  "Stamps",
  "Tools",
  "Presets",
  "Brush",
  "Layers",
  "Playback",
  "Framerate",
]);
const AUTOSAVE_STORAGE_KEY = "icyanimation-last-project-v1";
const AUTOSAVE_DELAY_MS = 1200;
const HISTORY_LIMIT = 24;
const HISTORY_DELAY_MS = 180;
const DEFAULT_PROJECT_NAME = "icyanimation-project.icy";
const DEFAULT_ROOM_NAME = "treefort-room.room";
let autosaveHandle = 0;
let autosaveAvailable = false;
let autosaveArmed = false;
let historyHandle = 0;
let isApplyingHistory = false;
let undoStack = [];
let redoStack = [];
let installPromptEvent = null;
let currentProjectFileName = DEFAULT_PROJECT_NAME;
let currentTreefortRoom = null;
let currentParchment = null;

const chewDialog = document.querySelector("#chewDialog");
const chewDialogPortrait = document.querySelector("#chewDialogPortrait");
const chewDialogText = document.querySelector("#chewDialogText");
const chewDialogActions = document.querySelector("#chewDialogActions");

const CHEW_FRAMES = ["./assets/chew/chew-happy.png", "./assets/chew/chew-talk.png"];
let chewDialogAnimInterval = 0;

function normalizeTreefortRoomMeta(projectData) {
  if (!projectData?.treefortRoom || typeof projectData.treefortRoom !== "object" || Array.isArray(projectData.treefortRoom)) {
    return null;
  }

  return cloneJson(projectData.treefortRoom);
}

function getProjectExtension(fileName) {
  const match = /\.([a-z0-9]+)$/i.exec(fileName ?? "");
  return match ? `.${match[1].toLowerCase()}` : "";
}

function isRoomMode() {
  return Boolean(currentTreefortRoom?.roomMode?.active);
}

function isKeyMode() {
  return Boolean(currentParchment);
}

function isLockedMode() {
  return isRoomMode() || isKeyMode();
}

function getRoomBackgroundNotice() {
  const notice = currentTreefortRoom?.roomMode?.backgroundNotice;
  return typeof notice === "string" && notice.trim().length > 0 ? notice : "ROOM COLORS ARE NOT EDITABLE";
}

function getSuggestedProjectName() {
  const baseName =
    typeof currentProjectFileName === "string" && currentProjectFileName.trim().length > 0
      ? currentProjectFileName.trim()
      : isRoomMode()
        ? DEFAULT_ROOM_NAME
        : DEFAULT_PROJECT_NAME;

  if (!isRoomMode()) {
    return baseName;
  }

  if (getProjectExtension(baseName) === ".room") {
    return baseName;
  }

  return `${baseName.replace(/\.[^.]+$/, "") || "treefort-room"}.room`;
}

function getOpenProjectFailureText() {
  return "Open project failed. Choose an .icy, .room, .Parchment, or .Room file.";
}

function setRoomModeStatusElements() {
  const roomMode = isRoomMode();
  const keyMode = isKeyMode();
  const locked = roomMode || keyMode;
  document.body.classList.toggle("is-room-mode", roomMode && !keyMode);
  document.body.classList.toggle("is-key-mode", keyMode);

  if (roomModeBadge) {
    if (keyMode) {
      roomModeBadge.hidden = false;
      roomModeBadge.textContent = "KEY MODE";
      roomModeBadge.className = "key-mode-badge";
    } else if (roomMode) {
      roomModeBadge.hidden = false;
      roomModeBadge.textContent = "ROOM MODE";
      roomModeBadge.className = "room-mode-badge";
    } else {
      roomModeBadge.hidden = true;
      roomModeBadge.className = "room-mode-badge";
    }
  }

  if (roomModeBackgroundNotice) {
    roomModeBackgroundNotice.hidden = !locked;
    roomModeBackgroundNotice.textContent = keyMode
      ? "DRAW YOUR KEY ON THIS CANVAS"
      : getRoomBackgroundNotice();
  }
}

function blockRoomModeAction(message) {
  if (!isLockedMode()) {
    return false;
  }

  setStatus(message);
  return true;
}

function decorateRainbowLabel(element, className, headingIndex = 0) {
  if (!element || element.dataset.rainbowDecorated === "true") {
    return;
  }

  const text = element.textContent ?? "";
  if (!text.trim()) {
    return;
  }

  element.textContent = "";
  element.classList.add(className);
  element.setAttribute("aria-label", text);
  element.dataset.rainbowDecorated = "true";

  [...text].forEach((character, characterIndex) => {
    const span = document.createElement("span");
    span.textContent = character === " " ? "\u00a0" : character;
    span.style.setProperty("--rainbow-delay", `${-(headingIndex * 0.6 + characterIndex * 0.22)}s`);
    element.append(span);
  });
}

function decoratePanelHeadings() {
  document.querySelectorAll(".panel h2").forEach((heading, headingIndex) => {
    const label = (heading.textContent ?? "").trim();
    if (rainbowPanelHeadings.has(label)) {
      decorateRainbowLabel(heading, "panel-rainbow", headingIndex + 1);
    }
  });
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image data."));
    image.src = source;
  });
}

function getProjectStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function updateAutosaveAvailability() {
  const storage = getProjectStorage();
  autosaveAvailable = Boolean(storage?.getItem(AUTOSAVE_STORAGE_KEY));
}

function queueAutosave() {
  if (!autosaveArmed) {
    autosaveArmed = true;
  }

  window.clearTimeout(autosaveHandle);
  autosaveHandle = window.setTimeout(() => {
    void writeAutosaveSnapshot();
  }, AUTOSAVE_DELAY_MS);
}

function markProjectDirty() {
  queueHistoryCheckpoint();
  queueAutosave();
}

async function writeAutosaveSnapshot() {
  window.clearTimeout(autosaveHandle);
  autosaveHandle = 0;

  if (!autosaveArmed || pointerState.active || selectionState.active || state.frames.length === 0) {
    return;
  }

  const storage = getProjectStorage();
  if (!storage) {
    return;
  }

  try {
    const snapshot = createProjectSnapshot();
    storage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(snapshot));
    autosaveAvailable = true;
    updateButtons();
  } catch (error) {
    console.error(error);
  }
}

async function continueLastProject() {
  const storage = getProjectStorage();
  if (!storage) {
    return;
  }

  const savedProject = storage.getItem(AUTOSAVE_STORAGE_KEY);
  if (!savedProject) {
    autosaveAvailable = false;
    updateButtons();
    return;
  }

  try {
    await loadProjectSnapshot(JSON.parse(savedProject));
    resetHistoryWithCurrentState();
    autosaveAvailable = true;
    autosaveArmed = true;
    await writeAutosaveSnapshot();
    if (isKeyMode()) {
      setStatus("Continued key drawing.");
    } else if (isRoomMode()) {
      setStatus("Continued room drawing.");
    } else {
      setStatus("Continued last project.");
    }
  } catch (error) {
    console.error(error);
    storage.removeItem(AUTOSAVE_STORAGE_KEY);
    autosaveAvailable = false;
    updateButtons();
    refreshUI({ revealFrame: true, revealBackground: true });
    setStatus("Continue failed. The last project could not be restored.");
  }
}

function createHistorySnapshotText() {
  return JSON.stringify(
    createProjectSnapshot({
      includeSavedAt: false,
    })
  );
}

function resetHistoryWithCurrentState() {
  window.clearTimeout(historyHandle);
  historyHandle = 0;
  undoStack = [createHistorySnapshotText()];
  redoStack = [];
  updateButtons();
}

function commitHistoryCheckpoint() {
  window.clearTimeout(historyHandle);
  historyHandle = 0;

  if (isApplyingHistory || pointerState.active || selectionState.active || state.frames.length === 0) {
    return;
  }

  const snapshotText = createHistorySnapshotText();
  if (undoStack[undoStack.length - 1] === snapshotText) {
    return;
  }

  undoStack.push(snapshotText);
  if (undoStack.length > HISTORY_LIMIT) {
    undoStack.shift();
  }
  redoStack = [];
  updateButtons();
}

function queueHistoryCheckpoint() {
  if (isApplyingHistory) {
    return;
  }

  window.clearTimeout(historyHandle);
  historyHandle = window.setTimeout(() => {
    commitHistoryCheckpoint();
  }, HISTORY_DELAY_MS);
}

async function restoreHistorySnapshot(snapshotText) {
  if (!snapshotText) {
    return;
  }

  isApplyingHistory = true;
  try {
    await loadProjectSnapshot(JSON.parse(snapshotText));
    autosaveArmed = true;
    await writeAutosaveSnapshot();
  } finally {
    isApplyingHistory = false;
    updateButtons();
  }
}

async function undoProject() {
  commitHistoryCheckpoint();
  if (undoStack.length <= 1) {
    return;
  }

  const currentSnapshot = undoStack.pop();
  if (currentSnapshot) {
    redoStack.push(currentSnapshot);
  }
  await restoreHistorySnapshot(undoStack[undoStack.length - 1]);
  setStatus("Undid change.");
}

async function redoProject() {
  commitHistoryCheckpoint();
  const nextSnapshot = redoStack.pop();
  if (!nextSnapshot) {
    return;
  }

  undoStack.push(nextSnapshot);
  await restoreHistorySnapshot(nextSnapshot);
  setStatus("Redid change.");
}

function makeId(prefix) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random()}`;
}

function createMaskCanvas(width = SCREEN_WIDTH, height = SCREEN_HEIGHT) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#000";
  return canvas;
}

function cloneCanvas(sourceCanvas) {
  const canvas = createMaskCanvas();
  canvas.getContext("2d").drawImage(sourceCanvas, 0, 0);
  return canvas;
}

function cloneConnectorAnchor(anchor) {
  return anchor ? { ...anchor } : null;
}

function cloneFrameObject(frameObject) {
  return {
    ...frameObject,
    contentLayers: frameObject.contentLayers?.map((layerCanvas) => cloneCanvas(layerCanvas)) ?? null,
    startAnchor: cloneConnectorAnchor(frameObject.startAnchor),
    endAnchor: cloneConnectorAnchor(frameObject.endAnchor),
  };
}

function createStampEntry({ label, src }, stampId = makeId("stamp")) {
  return {
    id: stampId,
    label,
    src,
    image: null,
    width: 0,
    height: 0,
    loaded: false,
  };
}

function loadStampEntry(stampEntry) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      stampEntry.image = image;
      stampEntry.width = image.naturalWidth || image.width;
      stampEntry.height = image.naturalHeight || image.height;
      stampEntry.loaded = true;
      if (state.frames.length > 0) {
        refreshUI();
      }
      resolve(stampEntry);
    };
    image.onerror = () => {
      stampEntry.image = null;
      stampEntry.width = 0;
      stampEntry.height = 0;
      stampEntry.loaded = false;
      if (state.frames.length > 0) {
        refreshUI();
      }
      resolve(stampEntry);
    };
    image.src = stampEntry.src;
  });
}

function createEmptyFrame() {
  return {
    id: makeId("frame"),
    layers: Array.from({ length: LAYER_COUNT }, () => createMaskCanvas()),
    objects: [],
  };
}

function createEmptyBackgroundClip() {
  return {
    id: makeId("background"),
    layers: Array.from({ length: LAYER_COUNT }, () => createMaskCanvas()),
    objects: [],
  };
}

function cloneFrame(frame) {
  return {
    id: makeId("frame"),
    layers: frame.layers.map((layerCanvas) => cloneCanvas(layerCanvas)),
    objects: frame.objects.map((frameObject) => cloneFrameObject(frameObject)),
  };
}

function cloneBackgroundClip(backgroundClip) {
  return {
    id: makeId("background"),
    layers: backgroundClip.layers.map((layerCanvas) => cloneCanvas(layerCanvas)),
    objects: backgroundClip.objects.map((frameObject) => cloneFrameObject(frameObject)),
  };
}

function getCurrentFrame() {
  return state.frames[state.currentFrameIndex];
}

function getBackgroundClipById(backgroundId) {
  return state.backgroundClips.find((backgroundClip) => backgroundClip.id === backgroundId) ?? null;
}

function getBackgroundClipLabel(backgroundId) {
  const index = state.backgroundClips.findIndex((backgroundClip) => backgroundClip.id === backgroundId);
  return index >= 0 ? `BG ${index + 1}` : "BG";
}

function getBackgroundIdForFrame(frameIndex = state.currentFrameIndex) {
  return state.backgroundAssignments[frameIndex] ?? null;
}

function getBackgroundClipForFrame(frameIndex = state.currentFrameIndex) {
  const backgroundId = getBackgroundIdForFrame(frameIndex);
  return backgroundId ? getBackgroundClipById(backgroundId) : null;
}

function getEditableTargetFrame() {
  if (state.editTarget === "background") {
    return getBackgroundClipForFrame();
  }

  return getCurrentFrame();
}

function getEditableTargetId() {
  return getEditableTargetFrame()?.id ?? null;
}

function getLayerContext(targetFrame = getEditableTargetFrame(), layerIndex = state.activeLayerIndex) {
  return targetFrame?.layers[layerIndex]?.getContext("2d", { willReadFrequently: true }) ?? null;
}

function getFrameLikeById(targetType, targetId) {
  if (!targetId) {
    return null;
  }

  if (targetType === "background") {
    return getBackgroundClipById(targetId);
  }

  return state.frames.find((frame) => frame.id === targetId) ?? null;
}

function ensureBackgroundAssignmentsLength() {
  while (state.backgroundAssignments.length < state.frames.length) {
    state.backgroundAssignments.push(null);
  }

  if (state.backgroundAssignments.length > state.frames.length) {
    state.backgroundAssignments.length = state.frames.length;
  }
}

function pruneUnusedBackgroundClips() {
  const usedBackgroundIds = new Set(
    state.backgroundAssignments.filter((backgroundId) => typeof backgroundId === "string")
  );
  state.backgroundClips = state.backgroundClips.filter(
    (backgroundClip) => usedBackgroundIds.has(backgroundClip.id)
  );
}

function clearCanvas(canvas) {
  canvas.getContext("2d").clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

let lastStatusMessage = "";

function renderStatus() {
  if (!statusLine) {
    return;
  }

  statusLine.textContent = lastStatusMessage;
}

function setStatus(message) {
  lastStatusMessage = message;
  renderStatus();
}

function isStandaloneAppMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches
  );
}

function consumeLaunchAction() {
  const url = new URL(window.location.href);
  const launchAction = url.searchParams.get("launch");
  if (!launchAction) {
    return null;
  }

  url.searchParams.delete("launch");
  window.history.replaceState({}, document.title, url);
  return launchAction;
}

function updateInstallButton() {
  if (!installAppButton) {
    return;
  }

  if (isStandaloneAppMode()) {
    installAppButton.hidden = false;
    installAppButton.disabled = true;
    installAppButton.textContent = "Installed";
    return;
  }

  if (installPromptEvent) {
    installAppButton.hidden = false;
    installAppButton.disabled = false;
    installAppButton.textContent = "Install App";
    return;
  }

  installAppButton.hidden = true;
  installAppButton.disabled = false;
  installAppButton.textContent = "Install App";
}

async function promptInstallApp() {
  if (!installPromptEvent) {
    return;
  }

  const deferredPrompt = installPromptEvent;
  installPromptEvent = null;
  updateInstallButton();

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      setStatus("Install accepted. ChromeOS will add IcyAnimation as an app.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Install prompt failed.");
  } finally {
    updateInstallButton();
  }
}

function attachInstallEvents() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    updateInstallButton();
    setStatus("IcyAnimation installed. Launch it from the Chromebook shelf.");
  });

  installAppButton?.addEventListener("click", () => {
    void promptInstallApp();
  });

  updateInstallButton();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error(error);
  }
}

function attachLaunchQueueHandler() {
  if (!("launchQueue" in window) || typeof window.launchQueue?.setConsumer !== "function") {
    return;
  }

  window.launchQueue.setConsumer(async (launchParams) => {
    const [fileHandle] = launchParams.files ?? [];
    if (!fileHandle?.getFile) {
      return;
    }

    try {
      await openProjectFile(await fileHandle.getFile());
    } catch (error) {
      console.error(error);
      setStatus(getOpenProjectFailureText());
    }
  });
}

async function applyLaunchAction() {
  const launchAction = consumeLaunchAction();
  if (!launchAction) {
    return;
  }

  switch (launchAction) {
    case "continue":
      if (autosaveAvailable) {
        await continueLastProject();
      } else {
        setStatus("No saved project is available yet.");
      }
      break;
    case "new":
      setStatus("Started a new animation.");
      break;
    default:
      break;
  }
}

function chooseColor(layerIndex) {
  return palette[state.layerPaletteIndexes[layerIndex]].hex;
}

function getObjectLabel(type) {
  return presetCatalog[type]?.label ?? "Object";
}

function getSelectedObject() {
  const targetFrame = getEditableTargetFrame();
  if (!targetFrame || !state.selectedObjectId) {
    return null;
  }

  return findObjectById(targetFrame, state.selectedObjectId);
}

function getNoteColor(noteColorId) {
  return noteColors.find((entry) => entry.id === noteColorId) ?? noteColors[0];
}

function getStampEntry(stampId) {
  return state.stamps.find((entry) => entry.id === stampId) ?? null;
}

function getActiveStampEntry() {
  return state.activeStampId ? getStampEntry(state.activeStampId) : null;
}

function isOverlayObject(frameObject) {
  return Boolean(presetCatalog[frameObject.type]?.overlay);
}

function isWritableObject(frameObject) {
  return Boolean(presetCatalog[frameObject.type]?.writable);
}

function isAnchorableObject(frameObject) {
  return frameObject.type === "title" || frameObject.type === "note";
}

function getObjectContentBounds(frameObject) {
  const bounds = getObjectBounds(frameObject);
  return {
    x: bounds.x + 1,
    y: bounds.y + 1,
    width: Math.max(1, bounds.width - 2),
    height: Math.max(1, bounds.height - 2),
  };
}

function ensureObjectContentLayers(frameObject) {
  if (!isWritableObject(frameObject)) {
    return null;
  }

  const bounds = getObjectContentBounds(frameObject);
  if (
    frameObject.contentLayers &&
    frameObject.contentLayers.length === LAYER_COUNT &&
    frameObject.contentLayers[0]?.width === bounds.width &&
    frameObject.contentLayers[0]?.height === bounds.height
  ) {
    return frameObject.contentLayers;
  }

  frameObject.contentLayers = Array.from({ length: LAYER_COUNT }, () =>
    createMaskCanvas(bounds.width, bounds.height)
  );
  return frameObject.contentLayers;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getSoloSceneOptions() {
  return {
    includeBackground: state.soloTrack !== "frame",
    includeForeground: state.soloTrack !== "background",
  };
}

function normalizeRect(start, end, minWidth = 1, minHeight = 1) {
  let width = Math.abs(end.x - start.x) + 1;
  let height = Math.abs(end.y - start.y) + 1;
  width = clamp(Math.max(width, minWidth), 1, SCREEN_WIDTH);
  height = clamp(Math.max(height, minHeight), 1, SCREEN_HEIGHT);

  let x = end.x >= start.x ? start.x : start.x - width + 1;
  let y = end.y >= start.y ? start.y : start.y - height + 1;

  x = clamp(x, 0, SCREEN_WIDTH - width);
  y = clamp(y, 0, SCREEN_HEIGHT - height);

  return { x, y, width, height };
}

function getPolygonBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = clamp(Math.min(...xs), 0, SCREEN_WIDTH - 1);
  const maxX = clamp(Math.max(...xs), 0, SCREEN_WIDTH - 1);
  const minY = clamp(Math.min(...ys), 0, SCREEN_HEIGHT - 1);
  const maxY = clamp(Math.max(...ys), 0, SCREEN_HEIGHT - 1);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}

function drawTintedLayer(targetContext, sourceCanvas, color, alpha = 1, dx = 0, dy = 0) {
  if (tintCanvas.width !== sourceCanvas.width || tintCanvas.height !== sourceCanvas.height) {
    tintCanvas.width = sourceCanvas.width;
    tintCanvas.height = sourceCanvas.height;
    tintContext.imageSmoothingEnabled = false;
  }

  tintContext.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  tintContext.fillStyle = color;
  tintContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  tintContext.globalCompositeOperation = "destination-in";
  tintContext.drawImage(sourceCanvas, 0, 0);
  tintContext.globalCompositeOperation = "source-over";

  targetContext.save();
  targetContext.globalAlpha = alpha;
  targetContext.drawImage(tintCanvas, dx, dy);
  targetContext.restore();
}

function plotLine(targetContext, fromX, fromY, toX, toY, size = 1) {
  let x0 = Math.round(fromX);
  let y0 = Math.round(fromY);
  const x1 = Math.round(toX);
  const y1 = Math.round(toY);
  const radius = Math.floor(size / 2);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    targetContext.fillRect(x0 - radius, y0 - radius, size, size);
    if (x0 === x1 && y0 === y1) {
      break;
    }

    const twiceError = 2 * error;
    if (twiceError >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twiceError <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function drawRectOutline(targetContext, x, y, width, height, color, thickness = 1) {
  if (width <= 0 || height <= 0) {
    return;
  }

  targetContext.fillStyle = color;
  targetContext.fillRect(x, y, width, thickness);
  targetContext.fillRect(x, y + height - thickness, width, thickness);
  targetContext.fillRect(x, y, thickness, height);
  targetContext.fillRect(x + width - thickness, y, thickness, height);
}

function drawMarqueeRect(targetContext, x, y, width, height) {
  if (width <= 0 || height <= 0) {
    return;
  }

  for (let offset = 0; offset < width; offset += 1) {
    targetContext.fillStyle = offset % 2 === 0 ? "#ffffff" : "#17191d";
    targetContext.fillRect(x + offset, y, 1, 1);
    targetContext.fillStyle = offset % 2 === 0 ? "#17191d" : "#ffffff";
    targetContext.fillRect(x + offset, y + height - 1, 1, 1);
  }

  for (let offset = 0; offset < height; offset += 1) {
    targetContext.fillStyle = offset % 2 === 0 ? "#ffffff" : "#17191d";
    targetContext.fillRect(x, y + offset, 1, 1);
    targetContext.fillStyle = offset % 2 === 0 ? "#17191d" : "#ffffff";
    targetContext.fillRect(x + width - 1, y + offset, 1, 1);
  }
}

function thresholdCanvasAlpha(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    data[index + 3] = data[index + 3] >= 128 ? 255 : 0;
  }

  context.putImageData(imageData, 0, 0);
}

function hasOpaquePixels(canvas, bounds) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
  const { data } = imageData;

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0) {
      return true;
    }
  }

  return false;
}

function canvasHasOpaquePixels(canvas) {
  return hasOpaquePixels(canvas, {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  });
}

function selectionMatchesCurrent() {
  return (
    selectionState.active &&
    selectionState.targetType === state.editTarget &&
    selectionState.targetId === getEditableTargetId() &&
    selectionState.layerIndex === state.activeLayerIndex
  );
}

function clearFloatingSelectionState() {
  selectionState.active = false;
  selectionState.targetType = "frame";
  selectionState.targetId = null;
  selectionState.layerIndex = -1;
  selectionState.canvas = null;
  selectionState.bounds = null;
  selectionState.offsetX = 0;
  selectionState.offsetY = 0;
}

function getFloatingSelectionBounds() {
  if (!selectionMatchesCurrent() || !selectionState.bounds) {
    return null;
  }

  return {
    x: selectionState.bounds.x + selectionState.offsetX,
    y: selectionState.bounds.y + selectionState.offsetY,
    width: selectionState.bounds.width,
    height: selectionState.bounds.height,
  };
}

function isPointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  );
}

function isPointInFloatingSelection(point) {
  const bounds = getFloatingSelectionBounds();
  return bounds ? isPointInRect(point, bounds) : false;
}

function commitFloatingSelection() {
  if (!selectionState.active || !selectionState.canvas) {
    return;
  }

  const targetFrame = getFrameLikeById(selectionState.targetType, selectionState.targetId);
  if (!targetFrame) {
    clearFloatingSelectionState();
    return;
  }

  const layerCanvas = targetFrame.layers[selectionState.layerIndex];
  if (!layerCanvas) {
    clearFloatingSelectionState();
    return;
  }

  const layerContext = layerCanvas.getContext("2d");
  layerContext.drawImage(selectionState.canvas, selectionState.offsetX, selectionState.offsetY);
  clearFloatingSelectionState();
}

function serializeConnectorAnchor(anchor) {
  return anchor
    ? {
        objectId: anchor.objectId,
        edge: anchor.edge,
        offset: anchor.offset,
      }
    : null;
}

function serializeFrameObject(frameObject, frame = getCurrentFrame()) {
  const serialized = {
    id: frameObject.id,
    type: frameObject.type,
  };

  if (frameObject.type === "connector") {
    const { start, end } = getConnectorEndpoints(frameObject, frame);
    serialized.x1 = start.x;
    serialized.y1 = start.y;
    serialized.x2 = end.x;
    serialized.y2 = end.y;
    if (frameObject.startAnchor) {
      serialized.startAnchor = serializeConnectorAnchor(frameObject.startAnchor);
    }
    if (frameObject.endAnchor) {
      serialized.endAnchor = serializeConnectorAnchor(frameObject.endAnchor);
    }
  } else {
    serialized.x = frameObject.x;
    serialized.y = frameObject.y;
    serialized.width = frameObject.width;
    serialized.height = frameObject.height;
    if (frameObject.type === "note") {
      serialized.noteColorId = frameObject.noteColorId ?? noteColors[0].id;
    } else if (frameObject.type === "stamp") {
      const stampEntry = getStampEntry(frameObject.stampId);
      serialized.stampId = frameObject.stampId;
      serialized.stampLabel = stampEntry?.label ?? "Stamp";
      serialized.scale = frameObject.scale ?? 1;
    }
  }

  if (frameObject.contentLayers) {
    serialized.attachedLayers = frameObject.contentLayers
      .map((layerCanvas, layerIndex) => (canvasHasOpaquePixels(layerCanvas) ? layerIndex + 1 : null))
      .filter(Boolean);
  }

  return serialized;
}

function serializeMaskCanvas(canvas) {
  if (!canvas || !canvasHasOpaquePixels(canvas)) {
    return null;
  }

  return canvas.toDataURL("image/png");
}

function serializeObjectContentLayers(frameObject) {
  if (!frameObject.contentLayers) {
    return null;
  }

  const serializedLayers = frameObject.contentLayers.map((layerCanvas) => serializeMaskCanvas(layerCanvas));
  return serializedLayers.some(Boolean) ? serializedLayers : null;
}

function serializeProjectFrameObject(frameObject, frame = getCurrentFrame()) {
  const serialized = serializeFrameObject(frameObject, frame);
  const contentLayers = serializeObjectContentLayers(frameObject);
  if (contentLayers) {
    serialized.contentLayers = contentLayers;
  }
  return serialized;
}

function serializeFrameLike(frame) {
  return {
    id: frame.id,
    layers: frame.layers.map((layerCanvas) => serializeMaskCanvas(layerCanvas)),
    objects: frame.objects.map((frameObject) => serializeProjectFrameObject(frameObject, frame)),
  };
}

function serializeStampSource(stampEntry) {
  if (typeof stampEntry.src === "string" && stampEntry.src.startsWith("data:")) {
    return stampEntry.src;
  }

  if (!stampEntry.loaded || !stampEntry.image || !stampEntry.width || !stampEntry.height) {
    return stampEntry.src;
  }

  const canvas = document.createElement("canvas");
  canvas.width = stampEntry.width;
  canvas.height = stampEntry.height;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(stampEntry.image, 0, 0);
  return canvas.toDataURL("image/png");
}

function createProjectSnapshot(options = {}) {
  const {
    finalizeTransient = false,
    stopPlaybackBeforeSave = false,
    includeSavedAt = true,
  } = options;

  if (finalizeTransient) {
    settleTransientState({ preserveObjectSelection: true });
  }

  if (stopPlaybackBeforeSave) {
    stopPlayback();
  }

  const snapshot = {
    version: 1,
    app: "IcyAnimation",
    savedAt: includeSavedAt ? new Date().toISOString() : null,
    settings: {
      currentFrameIndex: clamp(state.currentFrameIndex, 0, Math.max(0, state.frames.length - 1)),
      activeLayerIndex: state.activeLayerIndex,
      brushSize: state.brushSize,
      tool: state.tool,
      activePreset: state.activePreset,
      activeNoteColor: state.activeNoteColor,
      stampScale: state.stampScale,
      activeStampId: state.activeStampId,
      fps: state.fps,
      onionSkin: state.onionSkin,
      soloTrack: state.soloTrack,
      editTarget: state.editTarget,
      layerVisibility: [...state.layerVisibility],
      layerPaletteIndexes: [...state.layerPaletteIndexes],
    },
    stamps: state.stamps.map((stampEntry) => ({
      id: stampEntry.id,
      label: stampEntry.label,
      src: serializeStampSource(stampEntry),
    })),
    frames: state.frames.map((frame) => serializeFrameLike(frame)),
    backgroundClips: state.backgroundClips.map((backgroundClip) => serializeFrameLike(backgroundClip)),
    backgroundAssignments: [...state.backgroundAssignments],
  };

  if (currentTreefortRoom) {
    snapshot.treefortRoom = cloneJson(currentTreefortRoom);
  }

  if (currentParchment) {
    snapshot.parchment = cloneJson(currentParchment);
  }

  return snapshot;
}

async function hydrateMaskCanvas(targetCanvas, source) {
  if (!targetCanvas || typeof source !== "string" || source.length === 0) {
    return;
  }

  const image = await loadImageElement(source);
  const context = targetCanvas.getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, targetCanvas.width, targetCanvas.height);
  thresholdCanvasAlpha(targetCanvas);
}

function deserializeConnectorAnchor(anchorData) {
  if (!anchorData || typeof anchorData.objectId !== "string") {
    return null;
  }

  const edge = ["left", "right", "top", "bottom"].includes(anchorData.edge)
    ? anchorData.edge
    : "left";

  return {
    objectId: anchorData.objectId,
    edge,
    offset: Math.max(0, Number(anchorData.offset) || 0),
  };
}

async function deserializeObjectContentLayers(frameObject, contentLayersData) {
  if (!Array.isArray(contentLayersData) || !contentLayersData.some(Boolean) || !isWritableObject(frameObject)) {
    return null;
  }

  const bounds = getObjectContentBounds(frameObject);
  const contentLayers = Array.from({ length: LAYER_COUNT }, () =>
    createMaskCanvas(bounds.width, bounds.height)
  );

  await Promise.all(
    contentLayers.map((layerCanvas, layerIndex) =>
      hydrateMaskCanvas(layerCanvas, contentLayersData[layerIndex])
    )
  );

  return contentLayers;
}

async function deserializeFrameObject(objectData) {
  if (!objectData || typeof objectData.type !== "string") {
    return null;
  }

  let frameObject = null;

  if (objectData.type === "connector") {
    frameObject = {
      id: typeof objectData.id === "string" ? objectData.id : makeId("obj"),
      type: "connector",
      x1: Math.round(Number(objectData.x1) || 0),
      y1: Math.round(Number(objectData.y1) || 0),
      x2: Math.round(Number(objectData.x2) || 0),
      y2: Math.round(Number(objectData.y2) || 0),
      startAnchor: deserializeConnectorAnchor(objectData.startAnchor),
      endAnchor: deserializeConnectorAnchor(objectData.endAnchor),
    };
  } else if (["title", "note", "stamp"].includes(objectData.type)) {
    frameObject = {
      id: typeof objectData.id === "string" ? objectData.id : makeId("obj"),
      type: objectData.type,
      x: Math.round(Number(objectData.x) || 0),
      y: Math.round(Number(objectData.y) || 0),
      width: Math.max(1, Math.round(Number(objectData.width) || 1)),
      height: Math.max(1, Math.round(Number(objectData.height) || 1)),
    };

    if (frameObject.type === "note") {
      frameObject.noteColorId =
        noteColors.find((entry) => entry.id === objectData.noteColorId)?.id ?? noteColors[0].id;
    } else if (frameObject.type === "stamp") {
      frameObject.stampId = typeof objectData.stampId === "string" ? objectData.stampId : null;
      frameObject.scale = clamp(Math.round(Number(objectData.scale) || 1), 1, 3);
    }
  }

  if (!frameObject) {
    return null;
  }

  const contentLayers = await deserializeObjectContentLayers(frameObject, objectData.contentLayers);
  if (contentLayers) {
    frameObject.contentLayers = contentLayers;
  }

  return frameObject;
}

async function deserializeFrameLike(frameData, type = "frame") {
  const frameLike = type === "background" ? createEmptyBackgroundClip() : createEmptyFrame();

  if (typeof frameData?.id === "string") {
    frameLike.id = frameData.id;
  }

  if (Array.isArray(frameData?.layers)) {
    await Promise.all(
      frameLike.layers.map((layerCanvas, layerIndex) =>
        hydrateMaskCanvas(layerCanvas, frameData.layers[layerIndex])
      )
    );
  }

  const objects = [];
  if (Array.isArray(frameData?.objects)) {
    for (const objectData of frameData.objects) {
      const frameObject = await deserializeFrameObject(objectData);
      if (frameObject) {
        objects.push(frameObject);
      }
    }
  }

  frameLike.objects = objects;
  return frameLike;
}

function createFloatingSelectionFromPolygon(points) {
  if (points.length < 3) {
    return false;
  }

  const targetFrame = getEditableTargetFrame();
  const layerCanvas = targetFrame?.layers[state.activeLayerIndex];
  const layerContext = getLayerContext(targetFrame);
  if (!targetFrame || !layerCanvas || !layerContext) {
    return false;
  }

  const bounds = getPolygonBounds(points);
  const maskCanvas = createMaskCanvas();
  const maskContext = maskCanvas.getContext("2d");
  maskContext.fillStyle = "#000";
  maskContext.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      maskContext.moveTo(point.x + 0.5, point.y + 0.5);
    } else {
      maskContext.lineTo(point.x + 0.5, point.y + 0.5);
    }
  });
  maskContext.closePath();
  maskContext.fill();
  thresholdCanvasAlpha(maskCanvas);

  const selectedCanvas = createMaskCanvas();
  const selectedContext = selectedCanvas.getContext("2d");
  selectedContext.drawImage(layerCanvas, 0, 0);
  selectedContext.globalCompositeOperation = "destination-in";
  selectedContext.drawImage(maskCanvas, 0, 0);
  selectedContext.globalCompositeOperation = "source-over";
  thresholdCanvasAlpha(selectedCanvas);

  if (!hasOpaquePixels(selectedCanvas, bounds)) {
    return false;
  }

  layerContext.save();
  layerContext.globalCompositeOperation = "destination-out";
  layerContext.drawImage(maskCanvas, 0, 0);
  layerContext.restore();

  selectionState.active = true;
  selectionState.targetType = state.editTarget;
  selectionState.targetId = targetFrame.id;
  selectionState.layerIndex = state.activeLayerIndex;
  selectionState.canvas = selectedCanvas;
  selectionState.bounds = bounds;
  selectionState.offsetX = 0;
  selectionState.offsetY = 0;

  return true;
}

function createConnectorAnchor(frameObject, point) {
  const bounds = getObjectBounds(frameObject);
  const edgeDistances = [
    { edge: "left", distance: Math.abs(point.x - bounds.x) },
    { edge: "right", distance: Math.abs(bounds.x + bounds.width - 1 - point.x) },
    { edge: "top", distance: Math.abs(point.y - bounds.y) },
    { edge: "bottom", distance: Math.abs(bounds.y + bounds.height - 1 - point.y) },
  ];
  edgeDistances.sort((left, right) => left.distance - right.distance);

  const edge = edgeDistances[0].edge;
  const maxOffset =
    edge === "left" || edge === "right"
      ? Math.max(0, bounds.height - 1)
      : Math.max(0, bounds.width - 1);

  return {
    objectId: frameObject.id,
    edge,
    offset:
      edge === "left" || edge === "right"
        ? clamp(point.y - bounds.y, 0, maxOffset)
        : clamp(point.x - bounds.x, 0, maxOffset),
  };
}

function resolveConnectorAnchor(anchor, frame, fallbackPoint) {
  if (!anchor || !frame) {
    return fallbackPoint;
  }

  const targetObject = findObjectById(frame, anchor.objectId);
  if (!targetObject || !isAnchorableObject(targetObject)) {
    return fallbackPoint;
  }

  const bounds = getObjectBounds(targetObject, frame);
  if (anchor.edge === "left" || anchor.edge === "right") {
    return {
      x: anchor.edge === "left" ? bounds.x : bounds.x + bounds.width - 1,
      y: bounds.y + clamp(anchor.offset, 0, Math.max(0, bounds.height - 1)),
    };
  }

  return {
    x: bounds.x + clamp(anchor.offset, 0, Math.max(0, bounds.width - 1)),
    y: anchor.edge === "top" ? bounds.y : bounds.y + bounds.height - 1,
  };
}

function getConnectorEndpoints(frameObject, frame = getCurrentFrame()) {
  return {
    start: resolveConnectorAnchor(frameObject.startAnchor, frame, {
      x: frameObject.x1,
      y: frameObject.y1,
    }),
    end: resolveConnectorAnchor(frameObject.endAnchor, frame, {
      x: frameObject.x2,
      y: frameObject.y2,
    }),
  };
}

function getObjectBounds(frameObject, frame = getCurrentFrame()) {
  if (frameObject.type === "connector") {
    const { start, end } = getConnectorEndpoints(frameObject, frame);
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    return {
      x: clamp(minX - 2, 0, SCREEN_WIDTH - 1),
      y: clamp(minY - 2, 0, SCREEN_HEIGHT - 1),
      width: clamp(maxX - minX + 5, 1, SCREEN_WIDTH),
      height: clamp(maxY - minY + 5, 1, SCREEN_HEIGHT),
    };
  }

  return {
    x: frameObject.x,
    y: frameObject.y,
    width: frameObject.width,
    height: frameObject.height,
  };
}

function distanceToSegment(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }

  const projection =
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) /
    (dx * dx + dy * dy);
  const t = clamp(projection, 0, 1);
  const closestX = segmentStart.x + dx * t;
  const closestY = segmentStart.y + dy * t;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function hitTestObject(frameObject, point, frame = getCurrentFrame()) {
  if (frameObject.type === "connector") {
    const { start, end } = getConnectorEndpoints(frameObject, frame);
    return (
      distanceToSegment(
        point,
        { x: start.x, y: start.y },
        { x: end.x, y: end.y }
      ) <= 3
    );
  }

  return isPointInRect(point, getObjectBounds(frameObject, frame));
}

function findConnectorEndpointAtPoint(frame, point) {
  let closestHit = null;

  for (let index = frame.objects.length - 1; index >= 0; index -= 1) {
    const frameObject = frame.objects[index];
    if (frameObject.type !== "connector") {
      continue;
    }

    const { start, end } = getConnectorEndpoints(frameObject, frame);
    const hits = [
      { endpointName: "start", distance: Math.hypot(point.x - start.x, point.y - start.y) },
      { endpointName: "end", distance: Math.hypot(point.x - end.x, point.y - end.y) },
    ];

    hits.forEach((hit) => {
      if (hit.distance > 5) {
        return;
      }

      if (!closestHit || hit.distance < closestHit.distance) {
        closestHit = {
          object: frameObject,
          endpointName: hit.endpointName,
          distance: hit.distance,
        };
      }
    });
  }

  return closestHit;
}

function findObjectById(frame, objectId) {
  return frame.objects.find((frameObject) => frameObject.id === objectId) ?? null;
}

function detachConnectorEndpoint(frameObject, endpointName, frame = getCurrentFrame()) {
  if (frameObject.type !== "connector") {
    return;
  }

  const { start, end } = getConnectorEndpoints(frameObject, frame);
  if (endpointName === "start") {
    frameObject.x1 = start.x;
    frameObject.y1 = start.y;
    frameObject.startAnchor = null;
    return;
  }

  frameObject.x2 = end.x;
  frameObject.y2 = end.y;
  frameObject.endAnchor = null;
}

function detachConnectorAnchors(frameObject, frame = getCurrentFrame()) {
  detachConnectorEndpoint(frameObject, "start", frame);
  detachConnectorEndpoint(frameObject, "end", frame);
}

function setConnectorEndpointPosition(frameObject, endpointName, point) {
  if (endpointName === "start") {
    frameObject.x1 = point.x;
    frameObject.y1 = point.y;
    return;
  }

  frameObject.x2 = point.x;
  frameObject.y2 = point.y;
}

function snapConnectorEndpoint(frameObject, endpointName, point, frame = getCurrentFrame()) {
  const targetObject = findAnchorableObjectAtPoint(frame, point);
  if (endpointName === "start") {
    frameObject.startAnchor = targetObject ? createConnectorAnchor(targetObject, point) : null;
  } else {
    frameObject.endAnchor = targetObject ? createConnectorAnchor(targetObject, point) : null;
  }

  if (!targetObject) {
    setConnectorEndpointPosition(frameObject, endpointName, point);
    return;
  }

  const { start, end } = getConnectorEndpoints(frameObject, frame);
  frameObject.x1 = start.x;
  frameObject.y1 = start.y;
  frameObject.x2 = end.x;
  frameObject.y2 = end.y;
}

function detachConnectorsFromObject(objectId, frame = getCurrentFrame()) {
  frame.objects.forEach((frameObject) => {
    if (frameObject.type !== "connector") {
      return;
    }

    if (frameObject.startAnchor?.objectId === objectId) {
      detachConnectorEndpoint(frameObject, "start", frame);
    }

    if (frameObject.endAnchor?.objectId === objectId) {
      detachConnectorEndpoint(frameObject, "end", frame);
    }
  });
}

function deleteObjectById(objectId) {
  const targetFrame = getEditableTargetFrame();
  if (!targetFrame) {
    return null;
  }

  const objectIndex = targetFrame.objects.findIndex((frameObject) => frameObject.id === objectId);
  if (objectIndex === -1) {
    return null;
  }

  detachConnectorsFromObject(objectId, targetFrame);
  const [removedObject] = targetFrame.objects.splice(objectIndex, 1);
  if (state.selectedObjectId === objectId) {
    state.selectedObjectId = null;
  }
  return removedObject;
}

function findObjectAtPoint(frame, point, options = {}) {
  const { overlayOnly = false, writableOnly = false, anchorableOnly = false } = options;
  for (let index = frame.objects.length - 1; index >= 0; index -= 1) {
    const frameObject = frame.objects[index];
    if (overlayOnly && !isOverlayObject(frameObject)) {
      continue;
    }

    if (writableOnly && !isWritableObject(frameObject)) {
      continue;
    }

    if (anchorableOnly && !isAnchorableObject(frameObject)) {
      continue;
    }

    if (hitTestObject(frameObject, point, frame)) {
      return frameObject;
    }
  }

  return null;
}

function findAnchorableObjectAtPoint(frame, point) {
  return findObjectAtPoint(frame, point, { anchorableOnly: true });
}

function findWritableObjectAtPoint(frame, point) {
  const frameObject = findObjectAtPoint(frame, point, { overlayOnly: true, writableOnly: true });
  if (!frameObject) {
    return null;
  }

  return isPointInRect(point, getObjectContentBounds(frameObject)) ? frameObject : null;
}

function translateObject(frameObject, deltaX, deltaY, frame = getCurrentFrame()) {
  const bounds = getObjectBounds(frameObject, frame);
  const actualDeltaX = clamp(deltaX, -bounds.x, SCREEN_WIDTH - (bounds.x + bounds.width));
  const actualDeltaY = clamp(deltaY, -bounds.y, SCREEN_HEIGHT - (bounds.y + bounds.height));

  if (frameObject.type === "connector") {
    detachConnectorAnchors(frameObject, frame);
    frameObject.x1 += actualDeltaX;
    frameObject.y1 += actualDeltaY;
    frameObject.x2 += actualDeltaX;
    frameObject.y2 += actualDeltaY;
    return;
  }

  frameObject.x += actualDeltaX;
  frameObject.y += actualDeltaY;
}

function marryPixelsIntoObject(frameObject) {
  if (!isWritableObject(frameObject)) {
    return false;
  }

  const targetFrame = getEditableTargetFrame();
  if (!targetFrame) {
    return false;
  }

  const bounds = getObjectContentBounds(frameObject);
  const contentLayers = ensureObjectContentLayers(frameObject);
  let movedAnyPixels = false;

  targetFrame.layers.forEach((layerCanvas, layerIndex) => {
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    if (hasOpaquePixels(layerCanvas, bounds)) {
      movedAnyPixels = true;
    }

    const contentContext = contentLayers[layerIndex].getContext("2d");
    contentContext.drawImage(
      layerCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );

    layerCanvas
      .getContext("2d")
      .clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
  });

  return movedAnyPixels;
}

function drawPresentationBox(targetContext, frameObject) {
  const { x, y, width, height, type } = frameObject;
  const noteColor = type === "note" ? getNoteColor(frameObject.noteColorId) : null;
  const fillColor = noteColor?.fill ?? "#f1ead9";
  targetContext.fillStyle = fillColor;
  targetContext.fillRect(x + 1, y + 1, Math.max(0, width - 2), Math.max(0, height - 2));
  drawRectOutline(targetContext, x, y, width, height, "#17191d");

  if (type === "title") {
    targetContext.fillStyle = "#5d88c9";
    targetContext.fillRect(x + 1, y + 1, Math.max(0, width - 2), Math.min(height - 2, 6));
  }

  if (type === "note") {
    targetContext.fillStyle = "#17191d";
    const maxLineWidth = Math.max(4, width - 8);
    for (let line = 0; line < 3; line += 1) {
      const lineY = y + 4 + line * 4;
      if (lineY < y + height - 2) {
        targetContext.fillRect(x + 3, lineY, maxLineWidth, 1);
      }
    }

    targetContext.fillStyle = noteColor?.accent ?? "#ef8f50";
    targetContext.fillRect(x + width - 5, y + 1, 4, 4);
  }
}

function drawStampObject(targetContext, frameObject) {
  const stampEntry = getStampEntry(frameObject.stampId);
  if (stampEntry?.loaded && stampEntry.image) {
    targetContext.imageSmoothingEnabled = false;
    targetContext.drawImage(
      stampEntry.image,
      frameObject.x,
      frameObject.y,
      frameObject.width,
      frameObject.height
    );
    return;
  }

  targetContext.fillStyle = "#f1ead9";
  targetContext.fillRect(frameObject.x, frameObject.y, frameObject.width, frameObject.height);
  drawRectOutline(
    targetContext,
    frameObject.x,
    frameObject.y,
    frameObject.width,
    frameObject.height,
    "#17191d"
  );
}

function drawConnector(targetContext, frameObject, frame = getCurrentFrame()) {
  const { start, end } = getConnectorEndpoints(frameObject, frame);
  targetContext.fillStyle = "#17191d";
  plotLine(targetContext, start.x, start.y, end.x, end.y, 1);
  targetContext.fillRect(start.x - 1, start.y - 1, 3, 3);
  targetContext.fillRect(end.x - 1, end.y - 1, 3, 3);
}

function renderObjectContent(
  targetContext,
  frameObject,
  alpha = 1,
  overrideColors = null,
  honorLayerVisibility = true
) {
  if (!frameObject.contentLayers) {
    return;
  }

  const bounds = getObjectContentBounds(frameObject);
  frameObject.contentLayers.forEach((layerCanvas, layerIndex) => {
    if (honorLayerVisibility && !state.layerVisibility[layerIndex]) {
      return;
    }

    const color = overrideColors?.[layerIndex] ?? chooseColor(layerIndex);
    drawTintedLayer(targetContext, layerCanvas, color, alpha, bounds.x, bounds.y);
  });
}

function renderFrameObject(targetContext, frameObject, alpha = 1, frame = getCurrentFrame()) {
  targetContext.save();
  targetContext.globalAlpha *= alpha;

  if (frameObject.type === "connector") {
    drawConnector(targetContext, frameObject, frame);
  } else if (frameObject.type === "stamp") {
    drawStampObject(targetContext, frameObject);
  } else {
    drawPresentationBox(targetContext, frameObject);
  }

  targetContext.restore();
}

function renderFrameObjects(targetContext, frame, alpha = 1, options = {}) {
  const { phase = "all", overrideColors = null, honorLayerVisibility = true } = options;
  frame.objects.forEach((frameObject) => {
    const isOverlay = isOverlayObject(frameObject);
    if (phase === "base" && isOverlay) {
      return;
    }
    if (phase === "overlay" && !isOverlay) {
      return;
    }

    renderFrameObject(targetContext, frameObject, alpha, frame);
    renderObjectContent(targetContext, frameObject, alpha, overrideColors, honorLayerVisibility);
  });
}

function buildPresetObject(presetName, startPoint, endPoint) {
  if (presetName === "connector") {
    if (Math.abs(endPoint.x - startPoint.x) + Math.abs(endPoint.y - startPoint.y) < 2) {
      return null;
    }

    const frame = getEditableTargetFrame();
    if (!frame) {
      return null;
    }

    const frameObject = {
      id: makeId("obj"),
      type: "connector",
      x1: startPoint.x,
      y1: startPoint.y,
      x2: endPoint.x,
      y2: endPoint.y,
      startAnchor: null,
      endAnchor: null,
    };

    const startObject = findAnchorableObjectAtPoint(frame, startPoint);
    const endObject = findAnchorableObjectAtPoint(frame, endPoint);
    frameObject.startAnchor = startObject ? createConnectorAnchor(startObject, startPoint) : null;
    frameObject.endAnchor = endObject ? createConnectorAnchor(endObject, endPoint) : null;

    const { start, end } = getConnectorEndpoints(frameObject, frame);
    frameObject.x1 = start.x;
    frameObject.y1 = start.y;
    frameObject.x2 = end.x;
    frameObject.y2 = end.y;
    return frameObject;
  }

  const minimums = {
    title: [24, 12],
    note: [18, 14],
  };
  const [minWidth, minHeight] = minimums[presetName] ?? [10, 8];
  const rect = normalizeRect(startPoint, endPoint, minWidth, minHeight);

  const frameObject = {
    id: makeId("obj"),
    type: presetName,
    ...rect,
  };

  if (presetName === "note") {
    frameObject.noteColorId = state.activeNoteColor;
  }

  return frameObject;
}

function createStampObject(point) {
  const stampEntry = getActiveStampEntry();
  if (!stampEntry?.loaded || !stampEntry.width || !stampEntry.height) {
    return null;
  }

  const width = stampEntry.width * state.stampScale;
  const height = stampEntry.height * state.stampScale;
  return {
    id: makeId("obj"),
    type: "stamp",
    stampId: stampEntry.id,
    scale: state.stampScale,
    x: clamp(point.x - Math.floor(width / 2), 0, SCREEN_WIDTH - width),
    y: clamp(point.y - Math.floor(height / 2), 0, SCREEN_HEIGHT - height),
    width,
    height,
  };
}

function drawInteractionPath(targetContext, points, color) {
  if (points.length < 2) {
    return;
  }

  targetContext.fillStyle = color;
  for (let index = 1; index < points.length; index += 1) {
    plotLine(
      targetContext,
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
      1
    );
  }
}

function renderFloatingSelection(targetContext) {
  if (!selectionMatchesCurrent() || !selectionState.canvas) {
    return;
  }

  targetContext.drawImage(selectionState.canvas, selectionState.offsetX, selectionState.offsetY);
  const bounds = getFloatingSelectionBounds();
  if (bounds) {
    drawMarqueeRect(targetContext, bounds.x, bounds.y, bounds.width, bounds.height);
  }
}

function renderObjectSelectionOverlay(targetContext) {
  if (!state.selectedObjectId) {
    return;
  }

  const targetFrame = getEditableTargetFrame();
  const selectedObject = targetFrame ? findObjectById(targetFrame, state.selectedObjectId) : null;
  if (!targetFrame || !selectedObject) {
    return;
  }

  const bounds = getObjectBounds(selectedObject, targetFrame);
  drawMarqueeRect(targetContext, bounds.x, bounds.y, bounds.width, bounds.height);

  if (selectedObject.type === "connector") {
    const { start, end } = getConnectorEndpoints(selectedObject, targetFrame);
    targetContext.fillStyle = "#5d88c9";
    targetContext.fillRect(start.x - 2, start.y - 2, 5, 5);
    targetContext.fillRect(end.x - 2, end.y - 2, 5, 5);
  }
}

function renderLassoPreview(targetContext) {
  if (pointerState.mode !== "lasso") {
    return;
  }

  drawInteractionPath(targetContext, pointerState.lassoPoints, "#5d88c9");
}

function renderPresetPreview(targetContext) {
  if (pointerState.mode !== "preset") {
    return;
  }

  const targetFrame = getEditableTargetFrame();
  if (!targetFrame) {
    return;
  }

  const previewObject = buildPresetObject(
    state.activePreset,
    { x: pointerState.startX, y: pointerState.startY },
    { x: pointerState.currentX, y: pointerState.currentY }
  );
  if (!previewObject) {
    return;
  }

  renderFrameObject(targetContext, previewObject, 0.65, targetFrame);
  const bounds = getObjectBounds(previewObject, targetFrame);
  drawMarqueeRect(targetContext, bounds.x, bounds.y, bounds.width, bounds.height);
}

function renderStampPreview(targetContext) {
  if (state.tool !== "stamp" || pointerState.active || !pointerState.hasHover) {
    return;
  }

  if (!getEditableTargetFrame()) {
    return;
  }

  const previewObject = createStampObject({ x: pointerState.hoverX, y: pointerState.hoverY });
  if (!previewObject) {
    return;
  }

  renderFrameObject(targetContext, previewObject, 0.7, getEditableTargetFrame());
  drawMarqueeRect(
    targetContext,
    previewObject.x,
    previewObject.y,
    previewObject.width,
    previewObject.height
  );
}

function compositeFrame(targetContext, frame, options = {}) {
  const {
    alpha = 1,
    honorLayerVisibility = true,
    overrideColors = null,
  } = options;

  renderFrameObjects(targetContext, frame, alpha, {
    phase: "base",
    overrideColors,
    honorLayerVisibility,
  });

  frame.layers.forEach((layerCanvas, layerIndex) => {
    if (honorLayerVisibility && !state.layerVisibility[layerIndex]) {
      return;
    }

    const color = overrideColors?.[layerIndex] ?? chooseColor(layerIndex);
    drawTintedLayer(targetContext, layerCanvas, color, alpha);
  });

  renderFrameObjects(targetContext, frame, alpha, {
    phase: "overlay",
    overrideColors,
    honorLayerVisibility,
  });
}

function compositeScene(targetContext, frameIndex, options = {}) {
  const {
    alpha = 1,
    honorLayerVisibility = true,
    overrideColors = null,
    includeBackground = true,
    includeForeground = true,
    backgroundAlpha = alpha,
    foregroundAlpha = alpha,
  } = options;

  if (includeBackground) {
    const backgroundClip = getBackgroundClipForFrame(frameIndex);
    if (backgroundClip) {
      compositeFrame(targetContext, backgroundClip, {
        alpha: backgroundAlpha,
        honorLayerVisibility,
        overrideColors,
      });
    }
  }

  if (includeForeground) {
    const frame = state.frames[frameIndex];
    if (frame) {
      compositeFrame(targetContext, frame, {
        alpha: foregroundAlpha,
        honorLayerVisibility,
        overrideColors,
      });
    }
  }
}

function renderDisplay() {
  displayContext.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  const previousFrameIndex = state.currentFrameIndex - 1;
  const nextFrameIndex = state.currentFrameIndex + 1;
  const sceneOptions = getSoloSceneOptions();

  if (state.onionSkin && state.editTarget === "frame") {
    if (state.frames[previousFrameIndex]) {
      compositeScene(displayContext, previousFrameIndex, {
        alpha: 0.18,
        honorLayerVisibility: true,
        overrideColors: ["#6fd3ab", "#6fd3ab", "#6fd3ab"],
        ...sceneOptions,
      });
    }

    if (state.frames[nextFrameIndex]) {
      compositeScene(displayContext, nextFrameIndex, {
        alpha: 0.14,
        honorLayerVisibility: true,
        overrideColors: ["#ffb76a", "#ffb76a", "#ffb76a"],
        ...sceneOptions,
      });
    }
  }

  if (state.editTarget === "background") {
    if (state.onionSkin && sceneOptions.includeForeground) {
      if (state.frames[previousFrameIndex]) {
        compositeScene(displayContext, previousFrameIndex, {
          alpha: 0.12,
          honorLayerVisibility: true,
          overrideColors: ["#6fd3ab", "#6fd3ab", "#6fd3ab"],
          includeBackground: false,
        });
      }

      if (state.frames[nextFrameIndex]) {
        compositeScene(displayContext, nextFrameIndex, {
          alpha: 0.1,
          honorLayerVisibility: true,
          overrideColors: ["#ffb76a", "#ffb76a", "#ffb76a"],
          includeBackground: false,
        });
      }
    }

    const backgroundClip = getBackgroundClipForFrame();
    if (backgroundClip && sceneOptions.includeBackground) {
      compositeFrame(displayContext, backgroundClip, {
        alpha: 1,
        honorLayerVisibility: true,
      });
    }

    if (sceneOptions.includeForeground) {
      compositeScene(displayContext, state.currentFrameIndex, {
        alpha: sceneOptions.includeBackground ? 0.26 : 1,
        honorLayerVisibility: true,
        includeBackground: false,
        includeForeground: true,
      });
    }
  } else {
    compositeScene(displayContext, state.currentFrameIndex, {
      alpha: 1,
      honorLayerVisibility: true,
      ...sceneOptions,
    });
  }

  renderFloatingSelection(displayContext);
  renderPresetPreview(displayContext);
  renderStampPreview(displayContext);
  renderLassoPreview(displayContext);
  renderObjectSelectionOverlay(displayContext);
}

function renderArtboardThumbnail(canvas, artboard) {
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / SCREEN_WIDTH, canvas.height / SCREEN_HEIGHT);
  if (artboard) {
    compositeFrame(context, artboard, {
      alpha: 1,
      honorLayerVisibility: false,
    });
  }
  context.restore();
}

function renderThumbnail(canvas, frameIndex) {
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.scale(canvas.width / SCREEN_WIDTH, canvas.height / SCREEN_HEIGHT);
  const sceneOptions = getSoloSceneOptions();
  compositeScene(context, frameIndex, {
    alpha: 1,
    honorLayerVisibility: false,
    ...sceneOptions,
  });
  context.restore();

  if (frameIndex === state.currentFrameIndex) {
    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.85)";
    context.lineWidth = 4;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    context.restore();
  }
}

function renderTimeline(options = {}) {
  const { revealActive = false } = options;
  timeline.innerHTML = "";
  const roomMode = isLockedMode();

  state.frames.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    const isCurrentFrame = index === state.currentFrameIndex;
    const isSelectedTrackFrame = isCurrentFrame && state.editTarget === "frame";
    button.className = `frame-tile${isCurrentFrame ? " is-current" : ""}${isSelectedTrackFrame ? " is-selected" : ""}`;
    button.disabled = roomMode;
    button.addEventListener("click", () => {
      if (roomMode) {
        return;
      }
      state.editTarget = "frame";
      goToFrame(index);
    });

    const thumb = document.createElement("canvas");
    thumb.width = 88;
    thumb.height = 66;
    thumb.className = "frame-thumb";
    renderThumbnail(thumb, index);

    const meta = document.createElement("div");
    meta.className = "frame-meta";

    const label = document.createElement("span");
    label.textContent = `#${index + 1}`;
    const objectCount = document.createElement("span");
    const frame = state.frames[index];
    objectCount.textContent = frame.objects.length > 0 ? `O${frame.objects.length}` : `L${LAYER_COUNT}`;

    meta.append(label, objectCount);
    button.append(thumb, meta);
    timeline.append(button);
  });

  if (revealActive) {
    revealTrackItem(timeline, ".frame-tile.is-current");
  }
}

function revealTrackItem(trackElement, selector) {
  const activeItem = trackElement?.querySelector(selector);
  if (!(activeItem instanceof HTMLElement) || !(trackElement instanceof HTMLElement)) {
    return;
  }

  const padding = 8;
  const itemLeft = activeItem.offsetLeft;
  const itemRight = itemLeft + activeItem.offsetWidth;
  const viewLeft = trackElement.scrollLeft;
  const viewRight = viewLeft + trackElement.clientWidth;

  if (itemLeft < viewLeft) {
    trackElement.scrollLeft = Math.max(0, itemLeft - padding);
  } else if (itemRight > viewRight) {
    trackElement.scrollLeft = itemRight - trackElement.clientWidth + padding;
  }
}

function collectBackgroundSegments() {
  const segments = [];
  let startIndex = 0;

  while (startIndex < state.backgroundAssignments.length) {
    const backgroundId = state.backgroundAssignments[startIndex] ?? null;
    let endIndex = startIndex;

    while (endIndex + 1 < state.backgroundAssignments.length) {
      const nextBackgroundId = state.backgroundAssignments[endIndex + 1] ?? null;
      if (nextBackgroundId !== backgroundId) {
        break;
      }
      endIndex += 1;
    }

    segments.push({
      backgroundId,
      start: startIndex,
      end: endIndex,
      hold: endIndex - startIndex + 1,
    });
    startIndex = endIndex + 1;
  }

  return segments;
}

function getBackgroundSegmentAtFrame(frameIndex = state.currentFrameIndex) {
  return (
    collectBackgroundSegments().find(
      (segment) => frameIndex >= segment.start && frameIndex <= segment.end
    ) ?? null
  );
}

function renderBackgroundTimeline(options = {}) {
  const { revealActive = false } = options;
  if (!backgroundTimeline) {
    return;
  }

  backgroundTimeline.innerHTML = "";
  const segments = collectBackgroundSegments();
  const roomMode = isLockedMode();

  segments.forEach((segment) => {
    const button = document.createElement("button");
    const isCurrentSegment =
      state.currentFrameIndex >= segment.start &&
      state.currentFrameIndex <= segment.end;
    const isActiveSegment =
      state.editTarget === "background" &&
      isCurrentSegment;
    button.type = "button";
    button.className = `background-tile${isCurrentSegment ? " is-current" : ""}${isActiveSegment ? " is-selected" : ""}${segment.backgroundId ? "" : " is-empty"}`;
    button.style.width = `${segment.hold * 68 + Math.max(0, segment.hold - 1) * 4}px`;
    button.disabled = roomMode;
    button.addEventListener("click", (event) => {
      if (roomMode) {
        return;
      }
      const bounds = button.getBoundingClientRect();
      const pointerX = typeof event.clientX === "number" ? event.clientX : bounds.left;
      const localX = clamp(pointerX - bounds.left, 0, Math.max(1, bounds.width) - 1);
      const frameOffset = Math.min(
        segment.hold - 1,
        Math.floor((localX / Math.max(1, bounds.width)) * segment.hold)
      );
      state.editTarget = "background";
      goToFrame(segment.start + frameOffset);
    });

    const thumb = document.createElement("canvas");
    thumb.width = 60;
    thumb.height = 45;
    thumb.className = "frame-thumb background-thumb";
    renderArtboardThumbnail(thumb, segment.backgroundId ? getBackgroundClipById(segment.backgroundId) : null);

    const meta = document.createElement("div");
    meta.className = "background-meta";

    const label = document.createElement("span");
    label.textContent = segment.backgroundId ? getBackgroundClipLabel(segment.backgroundId) : "None";
    const range = document.createElement("span");
    range.textContent =
      segment.hold > 1 ? `F${segment.start + 1}-${segment.end + 1}` : `F${segment.start + 1}`;

    meta.append(label, range);
    button.append(thumb, meta);
    backgroundTimeline.append(button);
  });

  if (revealActive) {
    revealTrackItem(backgroundTimeline, ".background-tile.is-current");
  }
}

function renderLayersPanel() {
  layersPanel.innerHTML = "";

  for (let layerIndex = 0; layerIndex < LAYER_COUNT; layerIndex += 1) {
    const card = document.createElement("div");
    card.className = "layer-card";

    const head = document.createElement("div");
    head.className = "layer-head";

    const name = document.createElement("div");
    name.className = "layer-name";
    name.textContent = `Layer ${layerIndex + 1}`;

    const controls = document.createElement("div");
    controls.className = "layer-controls";

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = `chip${state.activeLayerIndex === layerIndex ? " is-active" : ""}`;
    selectButton.textContent = state.activeLayerIndex === layerIndex ? "Active" : "Select";
    selectButton.addEventListener("click", () => {
      commitFloatingSelection();
      state.activeLayerIndex = layerIndex;
      state.layerVisibility[layerIndex] = true;
      refreshUI();
      markProjectDirty();
    });

    const visibilityButton = document.createElement("button");
    visibilityButton.type = "button";
    visibilityButton.className = "chip";
    visibilityButton.textContent = state.layerVisibility[layerIndex] ? "Visible" : "Hidden";
    visibilityButton.addEventListener("click", () => {
      state.layerVisibility[layerIndex] = !state.layerVisibility[layerIndex];
      refreshUI();
      markProjectDirty();
    });

    controls.append(selectButton, visibilityButton);

    const swatches = document.createElement("div");
    swatches.className = "layer-swatches";

    const swatchLabel = document.createElement("span");
    swatchLabel.textContent = palette[state.layerPaletteIndexes[layerIndex]].name;
    swatchLabel.style.fontWeight = "700";
    swatchLabel.style.color = "#56656d";

    const swatchButtons = document.createElement("div");
    swatchButtons.className = "layer-controls";

    palette.forEach((entry, paletteIndex) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = `swatch${state.layerPaletteIndexes[layerIndex] === paletteIndex ? " is-active" : ""}`;
      swatch.style.background = entry.hex;
      swatch.title = entry.name;
      swatch.addEventListener("click", () => {
        state.layerPaletteIndexes[layerIndex] = paletteIndex;
        refreshUI();
        markProjectDirty();
      });
      swatchButtons.append(swatch);
    });

    head.append(name, controls);
    swatches.append(swatchLabel, swatchButtons);
    card.append(head, swatches);
    layersPanel.append(card);
  }
}

function renderNoteColorPanel() {
  if (!noteColorPanel) {
    return;
  }

  noteColorPanel.innerHTML = "";
  const selectedObject = getSelectedObject();
  const activeColorId =
    selectedObject?.type === "note"
      ? selectedObject.noteColorId ?? noteColors[0].id
      : state.activeNoteColor;

  noteColors.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `swatch${entry.id === activeColorId ? " is-active" : ""}`;
    button.title = entry.label;
    button.setAttribute("aria-label", entry.label);
    button.style.background = `linear-gradient(135deg, ${entry.fill} 0 72%, ${entry.accent} 72% 100%)`;
    button.addEventListener("click", () => {
      state.activeNoteColor = entry.id;
      const currentSelection = getSelectedObject();
      if (currentSelection?.type === "note") {
        currentSelection.noteColorId = entry.id;
      }
      refreshUI();
      markProjectDirty();
    });
    noteColorPanel.append(button);
  });
}

function renderStampTray() {
  if (!stampTray) {
    return;
  }

  stampTray.innerHTML = "";
  state.stamps.forEach((stampEntry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `stamp-slot${stampEntry.id === state.activeStampId ? " is-active" : ""}`;
    button.title = stampEntry.label;
    button.setAttribute("aria-label", stampEntry.label);
    button.addEventListener("click", () => {
      state.activeStampId = stampEntry.id;
      setTool("stamp");
      markProjectDirty();
    });

    if (stampEntry.loaded && stampEntry.image) {
      const image = document.createElement("img");
      image.className = "stamp-thumb";
      image.src = stampEntry.src;
      image.alt = stampEntry.label;
      button.append(image);
    } else {
      button.textContent = stampEntry.label.slice(0, 2).toUpperCase();
    }

    stampTray.append(button);
  });
}

function getActiveToolLabel() {
  if (state.tool === "preset") {
    return `${getObjectLabel(state.activePreset)} preset`;
  }

  return state.tool;
}

function updateButtons() {
  const roomMode = isLockedMode();
  setRoomModeStatusElements();

  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === state.tool);
    if (button.dataset.tool === "stamp") {
      button.disabled = roomMode;
    }
  });

  presetButtons.forEach((button) => {
    button.classList.toggle(
      "is-active",
      state.tool === "preset" && button.dataset.preset === state.activePreset
    );
    button.disabled = roomMode;
  });

  brushButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.size) === state.brushSize);
  });

  stampScaleButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.scale) === state.stampScale);
    button.disabled = roomMode;
  });

  fpsButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.fps) === state.fps);
  });

  playButton.textContent = state.isPlaying ? "Stop" : "Play";
  playButton.classList.toggle("is-active", state.isPlaying);
  onionToggle.checked = state.onionSkin;
  if (editModeLabel) {
    editModeLabel.textContent = state.editTarget === "background" ? "Background" : "Draw";
  }
  timelinePanel?.classList.toggle("is-selected", state.editTarget === "frame");
  framesPanel?.classList.toggle("is-selected", state.editTarget === "frame");
  backgroundPanel?.classList.toggle("is-selected", state.editTarget === "background");
  backgroundActionsPanel?.classList.toggle("is-selected", state.editTarget === "background");
  if (frameReadout) {
    frameReadout.textContent = `Frame ${state.currentFrameIndex + 1} / ${state.frames.length}`;
  }
  prevFrameButton.disabled = roomMode || state.currentFrameIndex === 0;
  nextFrameButton.disabled = roomMode || state.currentFrameIndex === state.frames.length - 1;
  if (replaceStampButton) {
    replaceStampButton.disabled = roomMode || !state.activeStampId;
  }
  if (addStampButton) {
    addStampButton.disabled = roomMode;
  }

  const currentBackgroundId = getBackgroundIdForFrame();
  const currentBackgroundSegment = getBackgroundSegmentAtFrame();
  if (splitBackgroundButton) {
    splitBackgroundButton.disabled =
      !currentBackgroundId ||
      !currentBackgroundSegment ||
      currentBackgroundSegment.hold <= 1 ||
      state.currentFrameIndex <= currentBackgroundSegment.start;
  }
  if (holdBackgroundButton) {
    holdBackgroundButton.disabled = !currentBackgroundId || !currentBackgroundSegment;
  }
  if (clearBackgroundButton) {
    clearBackgroundButton.disabled = !currentBackgroundId;
  }
  if (newFrameButton) {
    newFrameButton.disabled = roomMode;
  }
  if (duplicateFrameButton) {
    duplicateFrameButton.disabled = roomMode;
  }
  if (deleteFrameButton) {
    deleteFrameButton.disabled = roomMode;
  }
  if (clearFrameButton) {
    clearFrameButton.disabled = roomMode;
  }
  if (newBackgroundButton) {
    newBackgroundButton.disabled = roomMode;
  }
  if (splitBackgroundButton) {
    splitBackgroundButton.disabled = roomMode || splitBackgroundButton.disabled;
  }
  if (holdBackgroundButton) {
    holdBackgroundButton.disabled = roomMode || holdBackgroundButton.disabled;
  }
  if (clearBackgroundButton) {
    clearBackgroundButton.disabled = roomMode || clearBackgroundButton.disabled;
  }
  if (soloBackgroundTrackButton) {
    soloBackgroundTrackButton.disabled = roomMode;
  }
  if (playButton) {
    playButton.disabled = roomMode;
  }
  if (exportAllFramesButton) {
    exportAllFramesButton.disabled = roomMode;
  }
  if (exportGifButton) {
    exportGifButton.disabled = roomMode;
  }
  fpsButtons.forEach((button) => {
    button.disabled = roomMode;
  });
  soloDrawingsButton?.classList.toggle("is-active", state.soloTrack === "frame");
  soloBackgroundTrackButton?.classList.toggle("is-active", state.soloTrack === "background");
  if (continueProjectButton) {
    continueProjectButton.disabled = !autosaveAvailable;
  }
  if (undoButton) {
    undoButton.disabled = undoStack.length <= 1 || isApplyingHistory;
  }
  if (redoButton) {
    redoButton.disabled = redoStack.length === 0 || isApplyingHistory;
  }
}

function refreshUI(options = {}) {
  const { revealFrame = false, revealBackground = false } = options;
  ensureBackgroundAssignmentsLength();
  const editableTarget = getEditableTargetFrame();

  if (state.selectedObjectId && (!editableTarget || !findObjectById(editableTarget, state.selectedObjectId))) {
    state.selectedObjectId = null;
  }

  updateButtons();
  renderLayersPanel();
  renderNoteColorPanel();
  renderStampTray();
  renderTimeline({ revealActive: revealFrame });
  renderBackgroundTimeline({ revealActive: revealBackground || revealFrame });
  renderDisplay();
}

function resetPointerState() {
  pointerState.active = false;
  pointerState.mode = null;
  pointerState.objectId = null;
  pointerState.endpointName = null;
  pointerState.lassoPoints = [];
  pointerState.inkContext = null;
  pointerState.inkOffsetX = 0;
  pointerState.inkOffsetY = 0;
}

function settleTransientState(options = {}) {
  const { preserveObjectSelection = false } = options;
  commitFloatingSelection();
  resetPointerState();
  if (!preserveObjectSelection) {
    state.selectedObjectId = null;
  }
}

function setTool(toolName) {
  if (!["lasso", "move"].includes(toolName)) {
    commitFloatingSelection();
  }

  if (!["move", "select"].includes(toolName)) {
    state.selectedObjectId = null;
  }

  state.tool = toolName;
  refreshUI();
}

function activatePreset(presetName) {
  commitFloatingSelection();
  state.selectedObjectId = null;
  state.tool = "preset";
  state.activePreset = presetName;
  refreshUI();
}

function addBackgroundClip() {
  if (blockRoomModeAction("Background is locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();

  let targetIndex = state.currentFrameIndex;
  const currentBackgroundId = getBackgroundIdForFrame();

  if (currentBackgroundId) {
    targetIndex = state.currentFrameIndex + 1;
    const nextBackgroundId =
      targetIndex < state.frames.length ? getBackgroundIdForFrame(targetIndex) : null;
    const needsInsertedFrame =
      targetIndex >= state.frames.length ||
      (nextBackgroundId !== null && nextBackgroundId !== currentBackgroundId);

    if (needsInsertedFrame) {
      state.frames.splice(targetIndex, 0, createEmptyFrame());
      state.backgroundAssignments.splice(targetIndex, 0, currentBackgroundId);
    }
  }

  const backgroundClip = createEmptyBackgroundClip();
  state.backgroundClips.push(backgroundClip);
  state.backgroundAssignments[targetIndex] = backgroundClip.id;
  state.currentFrameIndex = targetIndex;
  state.editTarget = "background";
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function splitCurrentBackgroundClip() {
  if (blockRoomModeAction("Background is locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  const currentBackgroundClip = getBackgroundClipForFrame();
  const currentSegment = getBackgroundSegmentAtFrame();
  if (!currentBackgroundClip) {
    refreshUI({ revealBackground: true });
    setStatus("Split background: this frame does not have a background cell yet.");
    return;
  }

  if (!currentSegment || currentSegment.hold <= 1) {
    state.editTarget = "background";
    refreshUI({ revealFrame: true, revealBackground: true });
    return;
  }

  if (state.currentFrameIndex <= currentSegment.start) {
    state.editTarget = "background";
    refreshUI({ revealFrame: true, revealBackground: true });
    return;
  }

  const clonedBackgroundClip = cloneBackgroundClip(currentBackgroundClip);
  state.backgroundClips.push(clonedBackgroundClip);
  for (let frameIndex = state.currentFrameIndex; frameIndex <= currentSegment.end; frameIndex += 1) {
    state.backgroundAssignments[frameIndex] = clonedBackgroundClip.id;
  }
  state.editTarget = "background";
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function toggleSoloTrack(trackName) {
  if (trackName === "background" && blockRoomModeAction("Background is locked.")) {
    return;
  }

  state.soloTrack = state.soloTrack === trackName ? null : trackName;
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function extendBackgroundHold() {
  if (blockRoomModeAction("Background is locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  const currentBackgroundId = getBackgroundIdForFrame();
  const currentSegment = getBackgroundSegmentAtFrame();
  if (!currentBackgroundId || !currentSegment) {
    refreshUI({ revealBackground: true });
    setStatus("Hold background: create or pick a background cell first.");
    return;
  }

  const nextFrameIndex = currentSegment.end + 1;
  const nextBackgroundId =
    nextFrameIndex < state.frames.length ? getBackgroundIdForFrame(nextFrameIndex) : null;
  const needsInsertedFrame =
    nextFrameIndex >= state.frames.length ||
    (nextBackgroundId !== null && nextBackgroundId !== currentBackgroundId);

  if (needsInsertedFrame) {
    state.frames.splice(nextFrameIndex, 0, createEmptyFrame());
    state.backgroundAssignments.splice(nextFrameIndex, 0, currentBackgroundId);
  } else {
    state.backgroundAssignments[nextFrameIndex] = currentBackgroundId;
  }

  state.currentFrameIndex = nextFrameIndex;
  state.editTarget = "background";
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function clearCurrentBackgroundCell() {
  if (blockRoomModeAction("Background is locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  if (!getBackgroundIdForFrame()) {
    refreshUI({ revealBackground: true });
    setStatus("Clear background: this frame is already empty.");
    return;
  }

  state.backgroundAssignments[state.currentFrameIndex] = null;
  pruneUnusedBackgroundClips();
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function addFrame() {
  if (blockRoomModeAction("Frame and GIF controls are locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  const currentBackgroundId = getBackgroundIdForFrame();
  const nextIndex = state.currentFrameIndex + 1;
  state.frames.splice(nextIndex, 0, createEmptyFrame());
  state.backgroundAssignments.splice(nextIndex, 0, currentBackgroundId);
  state.currentFrameIndex = nextIndex;
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function duplicateFrame() {
  if (blockRoomModeAction("Frame and GIF controls are locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  const currentBackgroundId = getBackgroundIdForFrame();
  const nextIndex = state.currentFrameIndex + 1;
  state.frames.splice(nextIndex, 0, cloneFrame(getCurrentFrame()));
  state.backgroundAssignments.splice(nextIndex, 0, currentBackgroundId);
  state.currentFrameIndex = nextIndex;
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function deleteFrame() {
  if (blockRoomModeAction("Frame and GIF controls are locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();

  if (state.frames.length === 1) {
    clearFrame();
    return;
  }

  state.frames.splice(state.currentFrameIndex, 1);
  state.backgroundAssignments.splice(state.currentFrameIndex, 1);
  ensureBackgroundAssignmentsLength();
  pruneUnusedBackgroundClips();
  state.currentFrameIndex = Math.min(state.currentFrameIndex, state.frames.length - 1);
  refreshUI({ revealFrame: true, revealBackground: true });
  markProjectDirty();
}

function clearFrame() {
  if (blockRoomModeAction("Frame and GIF controls are locked.")) {
    return;
  }

  settleTransientState();
  stopPlayback();
  const frame = getCurrentFrame();
  frame.layers.forEach((canvas) => clearCanvas(canvas));
  frame.objects = [];
  refreshUI();
  markProjectDirty();
}

function pixelFromEvent(event) {
  const bounds = displayCanvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * SCREEN_WIDTH);
  const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * SCREEN_HEIGHT);
  return {
    x: clamp(x, 0, SCREEN_WIDTH - 1),
    y: clamp(y, 0, SCREEN_HEIGHT - 1),
  };
}

function handleCanvasHover(event) {
  const point = pixelFromEvent(event);
  pointerState.hoverX = point.x;
  pointerState.hoverY = point.y;
  pointerState.hasHover = true;

  if (!pointerState.active && state.tool === "stamp") {
    renderDisplay();
  }
}

function clearCanvasHover() {
  if (!pointerState.hasHover) {
    return;
  }

  pointerState.hasHover = false;
  if (!pointerState.active && state.tool === "stamp") {
    renderDisplay();
  }
}

function ensureEditableTarget() {
  const editableTarget = getEditableTargetFrame();
  if (editableTarget) {
    return editableTarget;
  }

  refreshUI({ revealBackground: state.editTarget === "background" });
  if (state.editTarget === "background") {
    setStatus("Background mode: press New in Background to create a cell on this frame.");
  } else {
    setStatus("Nothing is available to edit on this frame.");
  }
  return null;
}

function resolveInkTarget(point) {
  const editableTarget = getEditableTargetFrame();
  if (!editableTarget) {
    return {
      context: null,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const noteObject = findWritableObjectAtPoint(editableTarget, point);
  if (!noteObject) {
    return {
      context: getLayerContext(editableTarget),
      offsetX: 0,
      offsetY: 0,
    };
  }

  const contentBounds = getObjectContentBounds(noteObject);
  const contentLayers = ensureObjectContentLayers(noteObject);
  return {
    context: contentLayers[state.activeLayerIndex].getContext("2d", { willReadFrequently: true }),
    offsetX: contentBounds.x,
    offsetY: contentBounds.y,
  };
}

function stamp(context, x, y, size, erase = false) {
  const offset = Math.floor(size / 2);
  const maxX = Math.max(0, context.canvas.width - size);
  const maxY = Math.max(0, context.canvas.height - size);
  const drawX = clamp(x - offset, 0, maxX);
  const drawY = clamp(y - offset, 0, maxY);

  if (erase) {
    context.clearRect(drawX, drawY, size, size);
  } else {
    context.fillRect(drawX, drawY, size, size);
  }
}

function drawLine(fromX, fromY, toX, toY, toolName) {
  const context = pointerState.inkContext ?? getLayerContext();
  if (!context) {
    return;
  }

  const localFromX = fromX - pointerState.inkOffsetX;
  const localFromY = fromY - pointerState.inkOffsetY;
  const localToX = toX - pointerState.inkOffsetX;
  const localToY = toY - pointerState.inkOffsetY;
  context.fillStyle = "#000";

  const steps = Math.max(Math.abs(localToX - localFromX), Math.abs(localToY - localFromY), 1);
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(localFromX + ((localToX - localFromX) * step) / steps);
    const y = Math.round(localFromY + ((localToY - localFromY) * step) / steps);
    stamp(context, x, y, state.brushSize, toolName === "eraser");
  }
}

function startSelectionDrag(point) {
  const bounds = getFloatingSelectionBounds();
  if (!bounds) {
    return false;
  }

  pointerState.active = true;
  pointerState.mode = "selection-drag";
  pointerState.dragOffsetX = point.x - bounds.x;
  pointerState.dragOffsetY = point.y - bounds.y;
  return true;
}

function startMoveGesture(point) {
  if (selectionMatchesCurrent() && isPointInFloatingSelection(point)) {
    return startSelectionDrag(point);
  }

  const frame = ensureEditableTarget();
  if (!frame) {
    return false;
  }

  const endpointHit = findConnectorEndpointAtPoint(frame, point);
  if (endpointHit) {
    const { object, endpointName } = endpointHit;
    detachConnectorEndpoint(object, endpointName, frame);
    setConnectorEndpointPosition(object, endpointName, point);
    state.selectedObjectId = object.id;
    pointerState.active = true;
    pointerState.mode = "connector-endpoint-drag";
    pointerState.objectId = object.id;
    pointerState.endpointName = endpointName;
    pointerState.lastX = point.x;
    pointerState.lastY = point.y;
    renderDisplay();
    return true;
  }

  const object = findObjectAtPoint(frame, point);
  if (!object) {
    state.selectedObjectId = null;
    refreshUI();
    return false;
  }

  state.selectedObjectId = object.id;
  pointerState.active = true;
  pointerState.mode = "object-drag";
  pointerState.objectId = object.id;
  pointerState.lastX = point.x;
  pointerState.lastY = point.y;
  renderDisplay();
  return true;
}

function startSelectGesture(point) {
  commitFloatingSelection();

  const editableTarget = ensureEditableTarget();
  if (!editableTarget) {
    return false;
  }

  const object = findObjectAtPoint(editableTarget, point, { writableOnly: true });
  if (!object) {
    state.selectedObjectId = null;
    refreshUI();
    return false;
  }

  marryPixelsIntoObject(object);
  state.selectedObjectId = object.id;
  pointerState.active = true;
  pointerState.mode = "object-drag";
  pointerState.objectId = object.id;
  pointerState.lastX = point.x;
  pointerState.lastY = point.y;
  renderDisplay();
  return true;
}

function startStroke(event) {
  const allowsRightClickErase =
    (state.tool === "pen" || state.tool === "eraser") && (event.button === 0 || event.button === 2);

  if (!allowsRightClickErase && event.button !== 0) {
    return;
  }

  event.preventDefault();
  stopPlayback();

  const point = pixelFromEvent(event);
  pointerState.startX = point.x;
  pointerState.startY = point.y;
  pointerState.currentX = point.x;
  pointerState.currentY = point.y;
  pointerState.lastX = point.x;
  pointerState.lastY = point.y;
  pointerState.objectId = null;
  pointerState.lassoPoints = [];
  pointerState.dragOffsetX = 0;
  pointerState.dragOffsetY = 0;
  pointerState.active = false;
  pointerState.mode = null;

  switch (state.tool) {
    case "pen":
    case "eraser":
      if (!ensureEditableTarget()) {
        return;
      }
      pointerState.active = true;
      pointerState.mode = "draw";
      pointerState.tool = event.button === 2 ? "eraser" : state.tool;
      {
        const inkTarget = resolveInkTarget(point);
        if (!inkTarget.context) {
          return;
        }
        pointerState.inkContext = inkTarget.context;
        pointerState.inkOffsetX = inkTarget.offsetX;
        pointerState.inkOffsetY = inkTarget.offsetY;
      }
      drawLine(point.x, point.y, point.x, point.y, pointerState.tool);
      renderDisplay();
      break;
    case "select":
      if (!startSelectGesture(point)) {
        return;
      }
      break;
    case "object-delete": {
      commitFloatingSelection();
      const editableTarget = ensureEditableTarget();
      if (!editableTarget) {
        return;
      }

      const object = findObjectAtPoint(editableTarget, point);
      if (object) {
        deleteObjectById(object.id);
        refreshUI();
        markProjectDirty();
        setStatus(`Deleted ${getObjectLabel(object.type).toLowerCase()}.`);
      } else {
        refreshUI();
        setStatus("Delete tool: click an object.");
      }
      return;
    }
    case "lasso":
      if (!ensureEditableTarget()) {
        return;
      }
      if (selectionMatchesCurrent() && isPointInFloatingSelection(point)) {
        startSelectionDrag(point);
      } else {
        commitFloatingSelection();
        state.selectedObjectId = null;
        pointerState.active = true;
        pointerState.mode = "lasso";
        pointerState.lassoPoints = [{ x: point.x, y: point.y }];
      }
      renderDisplay();
      break;
    case "move":
      if (!startMoveGesture(point)) {
        return;
      }
      break;
    case "stamp": {
      commitFloatingSelection();
      state.selectedObjectId = null;
      const editableTarget = ensureEditableTarget();
      if (!editableTarget) {
        return;
      }

      const frameObject = createStampObject(point);
      if (!frameObject) {
        refreshUI();
        setStatus("Stamp tool: pick a loaded stamp first.");
      } else {
        editableTarget.objects.push(frameObject);
        state.selectedObjectId = frameObject.id;
        refreshUI();
        markProjectDirty();
      }
      return;
    }
    case "preset":
      commitFloatingSelection();
      state.selectedObjectId = null;
      if (!ensureEditableTarget()) {
        return;
      }
      pointerState.active = true;
      pointerState.mode = "preset";
      renderDisplay();
      break;
    default:
      return;
  }

  if (pointerState.active) {
    displayCanvas.setPointerCapture(event.pointerId);
  }
}

function continueStroke(event) {
  if (!pointerState.active) {
    return;
  }

  event.preventDefault();
  const point = pixelFromEvent(event);
  pointerState.currentX = point.x;
  pointerState.currentY = point.y;

  switch (pointerState.mode) {
    case "draw":
      drawLine(pointerState.lastX, pointerState.lastY, point.x, point.y, pointerState.tool);
      pointerState.lastX = point.x;
      pointerState.lastY = point.y;
      renderDisplay();
      break;
    case "lasso":
      if (
        pointerState.lassoPoints.length === 0 ||
        Math.abs(point.x - pointerState.lastX) + Math.abs(point.y - pointerState.lastY) >= 1
      ) {
        pointerState.lassoPoints.push({ x: point.x, y: point.y });
        pointerState.lastX = point.x;
        pointerState.lastY = point.y;
        renderDisplay();
      }
      break;
    case "selection-drag": {
      const bounds = selectionState.bounds;
      if (!bounds) {
        break;
      }

      const nextX = point.x - pointerState.dragOffsetX;
      const nextY = point.y - pointerState.dragOffsetY;
      selectionState.offsetX = clamp(nextX - bounds.x, -bounds.x, SCREEN_WIDTH - (bounds.x + bounds.width));
      selectionState.offsetY = clamp(nextY - bounds.y, -bounds.y, SCREEN_HEIGHT - (bounds.y + bounds.height));
      renderDisplay();
      break;
    }
    case "object-drag": {
      const editableTarget = getEditableTargetFrame();
      const selectedObject = editableTarget ? findObjectById(editableTarget, pointerState.objectId) : null;
      if (!editableTarget || !selectedObject) {
        break;
      }

      translateObject(selectedObject, point.x - pointerState.lastX, point.y - pointerState.lastY, editableTarget);
      pointerState.lastX = point.x;
      pointerState.lastY = point.y;
      renderDisplay();
      break;
    }
    case "connector-endpoint-drag": {
      const editableTarget = getEditableTargetFrame();
      const selectedObject = editableTarget ? findObjectById(editableTarget, pointerState.objectId) : null;
      if (!editableTarget || !selectedObject || selectedObject.type !== "connector") {
        break;
      }

      setConnectorEndpointPosition(selectedObject, pointerState.endpointName, point);
      renderDisplay();
      break;
    }
    case "preset":
      renderDisplay();
      break;
    default:
      break;
  }
}

function finishStroke(event) {
  if (!pointerState.active) {
    return;
  }

  event.preventDefault();

  switch (pointerState.mode) {
    case "draw":
      refreshUI();
      markProjectDirty();
      break;
    case "lasso":
      if (createFloatingSelectionFromPolygon(pointerState.lassoPoints)) {
        refreshUI();
      } else {
        refreshUI();
        setStatus("Lasso area was empty on the active layer.");
      }
      break;
    case "selection-drag":
      commitFloatingSelection();
      refreshUI();
      markProjectDirty();
      break;
    case "object-drag":
      refreshUI();
      markProjectDirty();
      break;
    case "connector-endpoint-drag": {
      const editableTarget = getEditableTargetFrame();
      const selectedObject = editableTarget ? findObjectById(editableTarget, pointerState.objectId) : null;
      if (editableTarget && selectedObject?.type === "connector") {
        snapConnectorEndpoint(
          selectedObject,
          pointerState.endpointName,
          { x: pointerState.currentX, y: pointerState.currentY },
          editableTarget
        );
      }
      refreshUI();
      markProjectDirty();
      break;
    }
    case "preset": {
      const frameObject = buildPresetObject(
        state.activePreset,
        { x: pointerState.startX, y: pointerState.startY },
        { x: pointerState.currentX, y: pointerState.currentY }
      );

      if (frameObject) {
        getEditableTargetFrame()?.objects.push(frameObject);
        state.selectedObjectId = frameObject.id;
      }
      refreshUI();
      if (frameObject) {
        markProjectDirty();
      }
      break;
    }
    default:
      break;
  }

  if (event.pointerId !== undefined && displayCanvas.hasPointerCapture(event.pointerId)) {
    displayCanvas.releasePointerCapture(event.pointerId);
  }

  resetPointerState();
}

let playbackHandle = 0;
let lastPlaybackTick = 0;
let isSyncingTrackScroll = false;

function playbackLoop(timestamp) {
  if (!state.isPlaying) {
    return;
  }

  if (timestamp - lastPlaybackTick >= 1000 / state.fps) {
    lastPlaybackTick = timestamp;
    state.currentFrameIndex = (state.currentFrameIndex + 1) % state.frames.length;
    refreshUI();
  }

  playbackHandle = window.requestAnimationFrame(playbackLoop);
}

function startPlayback() {
  if (state.isPlaying || state.frames.length === 0) {
    return;
  }

  settleTransientState();
  state.isPlaying = true;
  lastPlaybackTick = 0;
  playbackHandle = window.requestAnimationFrame(playbackLoop);
  refreshUI();
}

function stopPlayback() {
  if (!state.isPlaying) {
    return;
  }

  state.isPlaying = false;
  window.cancelAnimationFrame(playbackHandle);
  refreshUI();
}

function togglePlayback() {
  if (blockRoomModeAction("Playback is locked.")) {
    return;
  }

  if (state.isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function renderFrameToCanvas(frameIndex, options = {}) {
  const { scale = 1, includeHiddenLayers = true } = options;
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_WIDTH * scale;
  canvas.height = SCREEN_HEIGHT * scale;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  const sceneOptions = getSoloSceneOptions();
  compositeScene(context, frameIndex, {
    alpha: 1,
    honorLayerVisibility: !includeHiddenLayers,
    ...sceneOptions,
  });
  return canvas;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 30000);
}

function buildDesktopDialogFilters(description, accept = {}) {
  const extensions = [...new Set(Object.values(accept).flatMap((value) => value ?? []))]
    .map((extension) => String(extension).trim().replace(/^\./, ""))
    .filter(Boolean);

  if (extensions.length === 0) {
    return [];
  }

  return [
    {
      name: description,
      extensions,
    },
  ];
}

async function saveBlobWithPicker(blob, suggestedName, options = {}) {
  const { description = "File", accept = {} } = options;

  if (desktopApi?.saveFile) {
    try {
      const result = await desktopApi.saveFile({
        suggestedName,
        filters: buildDesktopDialogFilters(description, accept),
        bytes: await blob.arrayBuffer(),
      });
      return result?.canceled !== true;
    } catch (error) {
      console.error(error);
    }
  }

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        excludeAcceptAllOption: false,
        types: [
          {
            description,
            accept,
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return false;
      }
      console.error(error);
    }
  }

  downloadBlob(blob, suggestedName);
  return true;
}

async function saveFilesWithPicker(files, options = {}) {
  const {
    suggestedDirectoryName = "icyanimation-frames",
    description = "File",
    accept = {},
  } = options;

  if (desktopApi?.saveFilesToDirectory) {
    try {
      return await desktopApi.saveFilesToDirectory({
        suggestedDirectoryName,
        files: await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            bytes: file.bytes ?? (file.blob ? await file.blob.arrayBuffer() : new ArrayBuffer(0)),
          }))
        ),
      });
    } catch (error) {
      console.error(error);
    }
  }

  if (typeof window.showDirectoryPicker === "function") {
    try {
      const directoryHandle = await window.showDirectoryPicker({
        id: suggestedDirectoryName,
        mode: "readwrite",
      });

      for (const file of files) {
        const fileHandle = await directoryHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        if (file.blob) {
          await writable.write(file.blob);
        } else {
          await writable.write(file.bytes ?? new ArrayBuffer(0));
        }
        await writable.close();
      }

      return {
        canceled: false,
        count: files.length,
      };
    } catch (error) {
      if (error?.name === "AbortError") {
        return {
          canceled: true,
          count: 0,
        };
      }
      console.error(error);
    }
  }

  let savedCount = 0;
  for (const file of files) {
    const blob =
      file.blob ?? new Blob([file.bytes ?? new ArrayBuffer(0)], { type: file.type ?? "application/octet-stream" });
    const didSave = await saveBlobWithPicker(blob, file.name, {
      description,
      accept,
    });
    if (!didSave) {
      return {
        canceled: savedCount === 0,
        count: savedCount,
      };
    }
    savedCount += 1;
  }

  return {
    canceled: false,
    count: savedCount,
  };
}

async function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type);
  });
}

async function waitForNextPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });
}

async function ensureExportAssetsReady() {
  const pendingStamps = state.stamps.filter(
    (stampEntry) => !stampEntry.loaded && typeof stampEntry.src === "string" && stampEntry.src.length > 0
  );

  if (pendingStamps.length === 0) {
    return;
  }

  await Promise.all(pendingStamps.map((stampEntry) => loadStampEntry(stampEntry)));
  await waitForNextPaint();
}

async function isValidGifBlob(blob) {
  if (!(blob instanceof Blob) || blob.size < 32) {
    return false;
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const header = String.fromCharCode(...bytes.slice(0, 6));
  return (header === "GIF89a" || header === "GIF87a") && bytes[bytes.length - 1] === 59;
}

async function buildGifBlobWithRetry(maxAttempts = 3) {
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    await ensureExportAssetsReady();
    await waitForNextPaint();

    const frameCanvases = state.frames.map((_, index) =>
      renderFrameToCanvas(index, { includeHiddenLayers: true })
    );
    const gifBlob = createGifBlob(frameCanvases, state.fps);

    if (await isValidGifBlob(gifBlob)) {
      return {
        ok: true,
        blob: gifBlob,
        attempt,
      };
    }

    await new Promise((resolve) => window.setTimeout(resolve, 80));
  }

  return {
    ok: false,
    blob: null,
    attempt,
  };
}

async function downloadCanvas(canvas, fileName, options = {}) {
  const {
    preferDialog = Boolean(desktopApi?.saveFile) || typeof window.showSaveFilePicker === "function",
    description = "PNG Image",
    accept = {
      "image/png": [".png"],
    },
  } = options;
  const blob = await canvasToBlob(canvas, "image/png");
  if (!blob) {
    setStatus("Export failed. Your browser did not return a PNG blob.");
    return false;
  }

  if (preferDialog) {
    return saveBlobWithPicker(blob, fileName, {
      description,
      accept,
    });
  }

  downloadBlob(blob, fileName);
  return true;
}

async function exportCurrentFrame() {
  settleTransientState({ preserveObjectSelection: true });
  const canvas = renderFrameToCanvas(state.currentFrameIndex, { includeHiddenLayers: true });
  const didDownload = await downloadCanvas(canvas, `icyanimation-frame-${state.currentFrameIndex + 1}.png`);
  refreshUI();
  if (didDownload) {
    setStatus(`Exported frame ${state.currentFrameIndex + 1} as transparent PNG.`);
  }
}

async function exportAllFramesToDesktopDirectory() {
  const files = [];
  for (let index = 0; index < state.frames.length; index += 1) {
    const frameCanvas = renderFrameToCanvas(index, { includeHiddenLayers: true });
    const blob = await canvasToBlob(frameCanvas, "image/png");
    if (!blob) {
      throw new Error("Your browser did not return a PNG blob.");
    }

    files.push({
      name: `icyanimation-frame-${index + 1}.png`,
      blob,
      type: "image/png",
    });
  }

  return saveFilesWithPicker(files, {
    suggestedDirectoryName: "icyanimation-frames",
    description: "PNG Image",
    accept: {
      "image/png": [".png"],
    },
  });
}

async function exportAllFrames() {
  settleTransientState({ preserveObjectSelection: true });
  let exportedCount = 0;

  try {
    const result = await exportAllFramesToDesktopDirectory();
    refreshUI();
    if (result?.canceled) {
      return;
    }

    exportedCount = Number(result?.count) || state.frames.length;
  } catch (error) {
    console.error(error);
    refreshUI();
    setStatus("All-frames export failed.");
    return;
  }

  if (exportedCount > 0) {
    setStatus(`Exported ${exportedCount} frame${exportedCount === 1 ? "" : "s"} as PNG files.`);
  }
}

function nextPowerOfTwo(value) {
  let power = 1;
  while (power < value) {
    power *= 2;
  }
  return power;
}

function buildGifQuantizedPalette() {
  const paletteEntries = [];
  for (let red = 0; red < 6; red += 1) {
    for (let green = 0; green < 7; green += 1) {
      for (let blue = 0; blue < 6; blue += 1) {
        paletteEntries.push([
          Math.round((red * 255) / 5),
          Math.round((green * 255) / 6),
          Math.round((blue * 255) / 5),
        ]);
      }
    }
  }
  return paletteEntries;
}

function quantizeGifColor(red, green, blue) {
  const redLevel = clamp(Math.round((red * 5) / 255), 0, 5);
  const greenLevel = clamp(Math.round((green * 6) / 255), 0, 6);
  const blueLevel = clamp(Math.round((blue * 5) / 255), 0, 5);
  return redLevel * 42 + greenLevel * 6 + blueLevel;
}

function buildGifFrames(frameCanvases) {
  const frameImageData = frameCanvases.map((canvas) =>
    canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT).data
  );

  const exactPalette = [];
  const exactPaletteMap = new Map();
  let needsQuantizedPalette = false;

  frameImageData.forEach((pixels) => {
    if (needsQuantizedPalette) {
      return;
    }

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 128) {
        continue;
      }

      const key = (pixels[index] << 16) | (pixels[index + 1] << 8) | pixels[index + 2];
      if (!exactPaletteMap.has(key)) {
        if (exactPalette.length >= 252) {
          needsQuantizedPalette = true;
          return;
        }

        exactPaletteMap.set(key, exactPalette.length);
        exactPalette.push([pixels[index], pixels[index + 1], pixels[index + 2]]);
      }
    }
  });

  const paletteEntries = needsQuantizedPalette ? buildGifQuantizedPalette() : exactPalette;
  const transparentIndex = paletteEntries.length;
  const colorTableSize = nextPowerOfTwo(Math.max(transparentIndex + 1, 2));
  const colorTable = Array.from({ length: colorTableSize }, (_, index) => paletteEntries[index] ?? [0, 0, 0]);

  const frameIndexes = frameImageData.map((pixels) => {
    const indexes = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT);
    for (let pixelIndex = 0, dataIndex = 0; dataIndex < pixels.length; dataIndex += 4, pixelIndex += 1) {
      if (pixels[dataIndex + 3] < 128) {
        indexes[pixelIndex] = transparentIndex;
        continue;
      }

      if (needsQuantizedPalette) {
        indexes[pixelIndex] = quantizeGifColor(
          pixels[dataIndex],
          pixels[dataIndex + 1],
          pixels[dataIndex + 2]
        );
        continue;
      }

      const key = (pixels[dataIndex] << 16) | (pixels[dataIndex + 1] << 8) | pixels[dataIndex + 2];
      indexes[pixelIndex] = exactPaletteMap.get(key);
    }
    return indexes;
  });

  return {
    colorTable,
    colorTableSize,
    frameIndexes,
    transparentIndex,
  };
}

function encodeGifLzw(indexes, minimumCodeSize) {
  const clearCode = 1 << minimumCodeSize;
  const endCode = clearCode + 1;
  const output = [];
  let codeSize = minimumCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  let nextCode = endCode + 1;
  let hasPreviousLiteral = false;
  let literalsSinceClear = 0;
  const maxLiteralsBeforeClear = 1024;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 255);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const resetEncoder = () => {
    codeSize = minimumCodeSize + 1;
    nextCode = endCode + 1;
    hasPreviousLiteral = false;
    literalsSinceClear = 0;
  };

  writeCode(clearCode);
  resetEncoder();

  for (const symbol of indexes) {
    if (literalsSinceClear >= maxLiteralsBeforeClear) {
      writeCode(clearCode);
      resetEncoder();
    }

    writeCode(symbol);
    literalsSinceClear += 1;

    if (hasPreviousLiteral && nextCode < 4096) {
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    }

    hasPreviousLiteral = true;
  }

  writeCode(endCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 255);
  }

  return new Uint8Array(output);
}

function createGifBlob(frameCanvases, framesPerSecond) {
  const { colorTable, colorTableSize, frameIndexes, transparentIndex } = buildGifFrames(frameCanvases);
  const bytes = [];
  const writeByte = (value) => {
    bytes.push(value & 255);
  };
  const writeShort = (value) => {
    writeByte(value & 255);
    writeByte((value >> 8) & 255);
  };
  const writeBytes = (values) => {
    values.forEach((value) => writeByte(value));
  };
  const writeSubBlocks = (blockBytes) => {
    for (let offset = 0; offset < blockBytes.length; offset += 255) {
      const chunk = blockBytes.slice(offset, offset + 255);
      writeByte(chunk.length);
      writeBytes([...chunk]);
    }
    writeByte(0);
  };

  const colorTableBits = Math.max(0, Math.ceil(Math.log2(colorTableSize)) - 1);
  const delay = Math.max(2, Math.round(100 / clamp(framesPerSecond, 1, 60)));
  writeBytes([71, 73, 70, 56, 57, 97]);
  writeShort(SCREEN_WIDTH);
  writeShort(SCREEN_HEIGHT);
  writeByte(128 | 112 | colorTableBits);
  writeByte(transparentIndex);
  writeByte(0);
  colorTable.forEach((entry) => writeBytes(entry));
  writeBytes([33, 255, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0]);

  const minimumCodeSize = Math.max(2, Math.ceil(Math.log2(colorTableSize)));
  frameIndexes.forEach((frameData) => {
    writeBytes([33, 249, 4, 9]);
    writeShort(delay);
    writeByte(transparentIndex);
    writeByte(0);
    writeByte(44);
    writeShort(0);
    writeShort(0);
    writeShort(SCREEN_WIDTH);
    writeShort(SCREEN_HEIGHT);
    writeByte(0);
    writeByte(minimumCodeSize);
    writeSubBlocks(encodeGifLzw(frameData, minimumCodeSize));
  });

  writeByte(59);
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}

async function exportGif() {
  if (blockRoomModeAction("GIF export is locked.")) {
    return;
  }

  settleTransientState({ preserveObjectSelection: true });
  setStatus("Building GIF...");

  const gifBuild = await buildGifBlobWithRetry();
  if (!gifBuild.ok || !gifBuild.blob) {
    refreshUI();
    setStatus("GIF export failed after 3 attempts.");
    return;
  }

  const gifBlob = gifBuild.blob;
  const didSave = await saveBlobWithPicker(gifBlob, "icyanimation.gif", {
    description: "GIF Image",
    accept: {
      "image/gif": [".gif"],
    },
  });
  refreshUI();
  if (didSave) {
    setStatus(
      `Exported ${state.frames.length} frame${state.frames.length === 1 ? "" : "s"} as a GIF${
        gifBuild.attempt > 1 ? ` on attempt ${gifBuild.attempt}` : ""
      }.`
    );
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function normalizeImportedStampSource(source) {
  const image = await loadImageElement(source);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Could not read imported stamp dimensions.");
  }

  const scale = Math.min(
    1,
    STAMP_IMPORT_MAX_WIDTH / width,
    STAMP_IMPORT_MAX_HEIGHT / height
  );

  if (scale >= 1) {
    return {
      src: source,
      wasResized: false,
    };
  }

  const targetWidth = clamp(Math.round(width * scale), 1, STAMP_IMPORT_MAX_WIDTH);
  const targetHeight = clamp(Math.round(height * scale), 1, STAMP_IMPORT_MAX_HEIGHT);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return {
    src: canvas.toDataURL("image/png"),
    wasResized: true,
  };
}

async function addStampFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));
  if (files.length === 0) {
    setStatus("Add stamp: choose at least one image file.");
    return;
  }

  let resizedCount = 0;
  for (const file of files) {
    const rawSource = await readFileAsDataURL(file);
    const { src, wasResized } = await normalizeImportedStampSource(rawSource);
    const stampEntry = createStampEntry(
      {
        label: file.name.replace(/\.[^.]+$/, "") || "Stamp",
        src,
      }
    );
    state.stamps.push(stampEntry);
    await loadStampEntry(stampEntry);
    state.activeStampId = stampEntry.id;
    if (wasResized) {
      resizedCount += 1;
    }
  }

  setTool("stamp");
  markProjectDirty();
  setStatus(
    `Added ${files.length} stamp${files.length === 1 ? "" : "s"} to the tray${
      resizedCount > 0
        ? `. ${resizedCount} fit to ${STAMP_IMPORT_MAX_WIDTH}x${STAMP_IMPORT_MAX_HEIGHT}.`
        : "."
    }`
  );
}

async function replaceActiveStamp(file) {
  const activeStamp = getActiveStampEntry();
  if (!activeStamp) {
    setStatus("Replace stamp: pick a tray slot first.");
    return;
  }

  if (!file || !file.type.startsWith("image/")) {
    setStatus("Replace stamp: choose an image file.");
    return;
  }

  activeStamp.label = file.name.replace(/\.[^.]+$/, "") || activeStamp.label;
  const rawSource = await readFileAsDataURL(file);
  const { src, wasResized } = await normalizeImportedStampSource(rawSource);
  activeStamp.src = src;
  activeStamp.loaded = false;
  activeStamp.image = null;
  activeStamp.width = 0;
  activeStamp.height = 0;
  await loadStampEntry(activeStamp);
  setTool("stamp");
  markProjectDirty();
  setStatus(
    `Replaced ${activeStamp.label.toLowerCase()} in the tray${
      wasResized
        ? ` and fit it to ${STAMP_IMPORT_MAX_WIDTH}x${STAMP_IMPORT_MAX_HEIGHT}`
        : ""
    }.`
  );
}

function normalizeLoadedState(settings, loadedStamps) {
  const validTools = new Set([
    "pen",
    "eraser",
    "stamp",
    "lasso",
    "move",
    "select",
    "object-delete",
    "preset",
  ]);
  const validStampIdSet = new Set(loadedStamps.map((stampEntry) => stampEntry.id));

  state.currentFrameIndex = clamp(
    Math.round(Number(settings?.currentFrameIndex) || 0),
    0,
    Math.max(0, state.frames.length - 1)
  );
  state.activeLayerIndex = clamp(Math.round(Number(settings?.activeLayerIndex) || 0), 0, LAYER_COUNT - 1);
  state.brushSize = Math.max(1, Math.round(Number(settings?.brushSize) || 1));
  state.tool = validTools.has(settings?.tool) ? settings.tool : "pen";
  state.activePreset = presetCatalog[settings?.activePreset] ? settings.activePreset : "note";
  state.activeNoteColor =
    noteColors.find((entry) => entry.id === settings?.activeNoteColor)?.id ?? noteColors[0].id;
  state.stampScale = clamp(Math.round(Number(settings?.stampScale) || 1), 1, 3);
  state.activeStampId =
    typeof settings?.activeStampId === "string" && validStampIdSet.has(settings.activeStampId)
      ? settings.activeStampId
      : loadedStamps[0]?.id ?? null;
  state.selectedObjectId = null;
  state.isPlaying = false;
  state.fps = [4, 12, 24, 30].includes(Number(settings?.fps)) ? Number(settings.fps) : 12;
  state.onionSkin = settings?.onionSkin !== false;
  state.soloTrack =
    settings?.soloTrack === "frame" || settings?.soloTrack === "background"
      ? settings.soloTrack
      : null;
  state.editTarget = settings?.editTarget === "background" ? "background" : "frame";
  state.layerVisibility = Array.from(
    { length: LAYER_COUNT },
    (_, layerIndex) => settings?.layerVisibility?.[layerIndex] !== false
  );
  state.layerPaletteIndexes = Array.from({ length: LAYER_COUNT }, (_, layerIndex) =>
    clamp(
      Math.round(Number(settings?.layerPaletteIndexes?.[layerIndex]) || layerIndex),
      0,
      palette.length - 1
    )
  );
}

async function loadProjectSnapshot(projectData, options = {}) {
  if (!projectData || !Array.isArray(projectData.frames) || projectData.frames.length === 0) {
    throw new Error("Project file is missing drawing frames.");
  }

  const nextTreefortRoom = normalizeTreefortRoomMeta(projectData);
  const nextFileName =
    typeof options.fileName === "string" && options.fileName.trim().length > 0
      ? options.fileName.trim()
      : nextTreefortRoom
        ? DEFAULT_ROOM_NAME
        : DEFAULT_PROJECT_NAME;

  settleTransientState();
  stopPlayback();
  clearFloatingSelectionState();

  const loadedFrames = [];
  for (const frameData of projectData.frames) {
    loadedFrames.push(await deserializeFrameLike(frameData, "frame"));
  }

  const loadedBackgroundClips = [];
  const savedBackgroundClips = Array.isArray(projectData.backgroundClips)
    ? projectData.backgroundClips
    : [];

  for (const backgroundData of savedBackgroundClips) {
    loadedBackgroundClips.push(await deserializeFrameLike(backgroundData, "background"));
  }

  if (loadedBackgroundClips.length === 0) {
    loadedBackgroundClips.push(createEmptyBackgroundClip());
  }

  const loadedStampsSource =
    Array.isArray(projectData.stamps) && projectData.stamps.length > 0
      ? projectData.stamps
      : defaultStampSources;

  const loadedStamps = loadedStampsSource.map((stampData, stampIndex) =>
    createStampEntry(
      {
        label:
          typeof stampData?.label === "string" && stampData.label.trim().length > 0
            ? stampData.label
            : `Stamp ${stampIndex + 1}`,
        src: typeof stampData?.src === "string" ? stampData.src : defaultStampSources[0].src,
      },
      typeof stampData?.id === "string" ? stampData.id : makeId("stamp")
    )
  );

  const backgroundClipIds = new Set(loadedBackgroundClips.map((backgroundClip) => backgroundClip.id));
  const backgroundAssignments = Array.from({ length: loadedFrames.length }, (_, frameIndex) => {
    const assignedId = projectData.backgroundAssignments?.[frameIndex];
    return typeof assignedId === "string" && backgroundClipIds.has(assignedId) ? assignedId : null;
  });

  if (!backgroundAssignments.some((backgroundId) => backgroundId)) {
    backgroundAssignments[0] = loadedBackgroundClips[0].id;
  }

  state.frames = loadedFrames;
  state.backgroundClips = loadedBackgroundClips;
  state.backgroundAssignments = backgroundAssignments;
  state.stamps = loadedStamps;
  ensureBackgroundAssignmentsLength();
  pruneUnusedBackgroundClips();
  normalizeLoadedState(projectData.settings, loadedStamps);
  currentTreefortRoom = nextTreefortRoom;
  currentParchment = projectData.parchment ? cloneJson(projectData.parchment) : null;
  currentProjectFileName = nextFileName;
  if (isLockedMode()) {
    state.currentFrameIndex = 0;
    state.editTarget = "frame";
    state.soloTrack = null;
    stopPlayback();
  }
  resetPointerState();
  refreshUI({ revealFrame: true, revealBackground: true });

  await Promise.all(state.stamps.map((stampEntry) => loadStampEntry(stampEntry)));
  refreshUI({ revealFrame: true, revealBackground: true });
}

async function saveProject() {
  if (isKeyMode()) {
    await saveSpecialKey();
    return;
  }

  const snapshot = createProjectSnapshot({
    finalizeTransient: true,
    stopPlaybackBeforeSave: true,
  });
  const projectBlob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/x-icyanimation+json",
  });
  const didSave = await saveBlobWithPicker(projectBlob, getSuggestedProjectName(), {
    description: isRoomMode() ? "Treefort Room Package" : "IcyAnimation Project",
    accept: isRoomMode()
      ? {
          "application/x-icyanimation+json": [".room"],
        }
      : {
          "application/x-icyanimation+json": [".icy"],
        },
  });
  if (!didSave) {
    refreshUI({ revealFrame: true, revealBackground: true });
    setStatus("Save canceled.");
    return;
  }
  autosaveArmed = true;
  await writeAutosaveSnapshot();
  refreshUI({ revealFrame: true, revealBackground: true });
  setStatus(isRoomMode() ? "Saved room package." : "Saved project file.");
}

async function saveSpecialKey() {
  settleTransientState({ preserveObjectSelection: true });
  stopPlayback();

  const canvas = renderFrameToCanvas(0, { includeHiddenLayers: true });
  const keyArt = canvas.toDataURL("image/png");

  const specialKey = {
    app: "IcyAnimation",
    questPhase: "awaiting-key",
    guestId: currentParchment.guestId,
    guestName: currentParchment.guestName,
    keyArt,
    savedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(specialKey, null, 2)], {
    type: "application/json",
  });

  const suggestedName = `${currentParchment.guestName || "key"}.SpecialKey`;
  const didSave = await saveBlobWithPicker(blob, suggestedName, {
    description: "TreeFort Special Key",
    accept: { "application/json": [".SpecialKey"] },
  });

  if (!didSave) {
    refreshUI({ revealFrame: true, revealBackground: true });
    setStatus("Save canceled.");
    return;
  }

  autosaveArmed = true;
  await writeAutosaveSnapshot();
  refreshUI({ revealFrame: true, revealBackground: true });

  showChewDialog({
    frames: CHEW_FRAMES,
    text: `It looks like you drew a StickerBook Key. Huh. Good luck. Tell Gum I said, "Hmph".`,
    actions: [{ label: "Got it!", onClick: hideChewDialog }],
  });
}

async function openProjectText(projectText, fileName) {
  const projectData = JSON.parse(projectText);

  // TreeFort instruction files (.Parchment, .Room)
  if (projectData?.app === "TreeFort" && projectData.questPhase) {
    await handleTreefortInstruction(projectData, fileName);
    return;
  }

  await loadProjectSnapshot(projectData, { fileName });
  resetHistoryWithCurrentState();
  autosaveArmed = true;
  await writeAutosaveSnapshot();

  if (isRoomMode()) {
    setStatus(`Opened room package ${fileName}.`);
    const roomChewText = typeof currentTreefortRoom?.chewMessage === "string" && currentTreefortRoom.chewMessage.trim().length > 0
      ? currentTreefortRoom.chewMessage
      : "Why do you keep coming back here? Oh. More stuff? Okay have fun.";
    const roomChewMood = CHEW_FRAMES;
    showChewDialog({
      frames: roomChewMood,
      text: roomChewText,
      actions: [{ label: "Let's go!", onClick: hideChewDialog }],
    });
  } else if (isKeyMode()) {
    setStatus(`Resumed key drawing.`);
    showChewDialog({
      frames: CHEW_FRAMES,
      text: "Glad to see you're taking your time with that Key.",
      actions: [{ label: "Let's go!", onClick: hideChewDialog }],
    });
  } else {
    setStatus(`Opened ${fileName}.`);
  }
}

async function openProjectFile(file) {
  if (!file) {
    return;
  }

  try {
    await openProjectText(await file.text(), file.name);
  } catch (error) {
    console.error(error);
    refreshUI({ revealFrame: true, revealBackground: true });
    setStatus(getOpenProjectFailureText());
  }
}

async function openProjectWithPicker() {
  if (!desktopApi?.openProjectFile) {
    openProjectInput?.click();
    return;
  }

  try {
    const result = await desktopApi.openProjectFile();
    if (!result || result.canceled || !result.text) {
      return;
    }

    await openProjectText(result.text, result.name ?? "project.icy");
  } catch (error) {
    console.error(error);
    refreshUI({ revealFrame: true, revealBackground: true });
    setStatus(getOpenProjectFailureText());
  }
}

function cycleBrush(direction) {
  const sizes = brushButtons.map((button) => Number(button.dataset.size));
  const currentIndex = sizes.indexOf(state.brushSize);
  const nextIndex = clamp(currentIndex + direction, 0, sizes.length - 1);
  state.brushSize = sizes[nextIndex];
  refreshUI();
}

function goToFrame(index) {
  if (isLockedMode() && index !== state.currentFrameIndex) {
    setStatus(isKeyMode() ? "Key mode: single frame only." : "Room mode: frame and GIF controls are locked.");
    return;
  }

  settleTransientState();
  stopPlayback();
  state.currentFrameIndex = clamp(index, 0, state.frames.length - 1);
  refreshUI({ revealFrame: true, revealBackground: true });
}

function changeFrame(delta) {
  if (isLockedMode() && delta !== 0) {
    setStatus(isKeyMode() ? "Key mode: single frame only." : "Room mode: frame and GIF controls are locked.");
    return;
  }

  goToFrame(state.currentFrameIndex + delta);
}

function handleShortcut(event) {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return;
  }

  if ((event.metaKey || event.ctrlKey) && !event.altKey) {
    const lowerKey = event.key.toLowerCase();
    if (lowerKey === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        void redoProject();
      } else {
        void undoProject();
      }
      return;
    }
    if (lowerKey === "y") {
      event.preventDefault();
      void redoProject();
      return;
    }
    if (lowerKey === "s") {
      event.preventDefault();
      void saveProject();
      return;
    }
    if (lowerKey === "o") {
      event.preventDefault();
      openProjectButton?.click();
      return;
    }
  }

  if (event.key === " ") {
    event.preventDefault();
    togglePlayback();
    return;
  }

  switch (event.key.toLowerCase()) {
    case "b":
      setTool("pen");
      break;
    case "e":
      setTool("eraser");
      break;
    case "t":
      if (isLockedMode()) {
        setStatus("Stamps and preset objects are locked.");
      } else {
        setTool("stamp");
      }
      break;
    case "x":
      setTool("object-delete");
      break;
    case "s":
      setTool("select");
      break;
    case "l":
      setTool("lasso");
      break;
    case "v":
      setTool("move");
      break;
    case "p":
      if (isLockedMode()) {
        setStatus("Stamps and preset objects are locked.");
      } else {
        activatePreset("note");
      }
      break;
    case "n":
      addFrame();
      break;
    case "d":
      duplicateFrame();
      break;
    case "o":
      state.onionSkin = !state.onionSkin;
      refreshUI();
      markProjectDirty();
      break;
    case "1":
    case "2":
    case "3":
      commitFloatingSelection();
      state.activeLayerIndex = Number(event.key) - 1;
      state.layerVisibility[state.activeLayerIndex] = true;
      refreshUI();
      markProjectDirty();
      break;
    case "[":
      cycleBrush(-1);
      break;
    case "]":
      cycleBrush(1);
      break;
    default:
      if (event.key === "ArrowRight") {
        event.preventDefault();
        changeFrame(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeFrame(-1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        addFrame();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (state.selectedObjectId) {
          const removedObject = deleteObjectById(state.selectedObjectId);
          refreshUI();
          if (removedObject) {
            markProjectDirty();
            setStatus(`Deleted ${getObjectLabel(removedObject.type).toLowerCase()}.`);
          }
        } else {
          deleteFrame();
        }
      }
      break;
  }
}

function syncTrackScroll(sourceTrack, targetTrack) {
  if (!(sourceTrack instanceof HTMLElement) || !(targetTrack instanceof HTMLElement)) {
    return;
  }

  sourceTrack.addEventListener("scroll", () => {
    if (isSyncingTrackScroll) {
      return;
    }

    isSyncingTrackScroll = true;
    targetTrack.scrollLeft = sourceTrack.scrollLeft;
    window.requestAnimationFrame(() => {
      isSyncingTrackScroll = false;
    });
  });
}

function attachEvents() {
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTool(button.dataset.tool);
    });
  });

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activatePreset(button.dataset.preset);
    });
  });

  brushButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.brushSize = Number(button.dataset.size);
      refreshUI();
    });
  });

  stampScaleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.stampScale = Number(button.dataset.scale);
      refreshUI();
    });
  });

  fpsButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.fps = Number(button.dataset.fps);
      refreshUI();
      markProjectDirty();
    });
  });

  prevFrameButton.addEventListener("click", () => changeFrame(-1));
  nextFrameButton.addEventListener("click", () => changeFrame(1));
  playButton.addEventListener("click", togglePlayback);
  onionToggle.addEventListener("change", () => {
    state.onionSkin = onionToggle.checked;
    refreshUI();
    markProjectDirty();
  });

  newFrameButton.addEventListener("click", addFrame);
  duplicateFrameButton.addEventListener("click", duplicateFrame);
  deleteFrameButton.addEventListener("click", deleteFrame);
  clearFrameButton.addEventListener("click", clearFrame);
  newBackgroundButton?.addEventListener("click", addBackgroundClip);
  splitBackgroundButton?.addEventListener("click", splitCurrentBackgroundClip);
  holdBackgroundButton?.addEventListener("click", extendBackgroundHold);
  clearBackgroundButton?.addEventListener("click", clearCurrentBackgroundCell);
  soloDrawingsButton?.addEventListener("click", () => toggleSoloTrack("frame"));
  soloBackgroundTrackButton?.addEventListener("click", () => toggleSoloTrack("background"));
  continueProjectButton?.addEventListener("click", () => {
    void continueLastProject();
  });
  undoButton?.addEventListener("click", () => {
    void undoProject();
  });
  redoButton?.addEventListener("click", () => {
    void redoProject();
  });
  saveProjectButton?.addEventListener("click", () => {
    void saveProject();
  });
  openProjectButton?.addEventListener("click", () => {
    void openProjectWithPicker();
  });
  openProjectInput?.addEventListener("change", async () => {
    const [file] = [...(openProjectInput.files ?? [])];
    if (file) {
      await openProjectFile(file);
    }
    openProjectInput.value = "";
  });

  exportFrameButton.addEventListener("click", exportCurrentFrame);
  exportAllFramesButton.addEventListener("click", exportAllFrames);
  exportGifButton.addEventListener("click", exportGif);

  addStampButton?.addEventListener("click", () => {
    addStampInput?.click();
  });
  replaceStampButton?.addEventListener("click", () => {
    if (!state.activeStampId) {
      setStatus("Replace stamp: pick a tray slot first.");
      return;
    }
    replaceStampInput?.click();
  });
  addStampInput?.addEventListener("change", async () => {
    if (addStampInput.files?.length) {
      await addStampFiles(addStampInput.files);
    }
    addStampInput.value = "";
  });
  replaceStampInput?.addEventListener("change", async () => {
    const [file] = [...(replaceStampInput.files ?? [])];
    if (file) {
      await replaceActiveStamp(file);
    }
    replaceStampInput.value = "";
  });

  displayCanvas.addEventListener("contextmenu", (event) => event.preventDefault());
  displayCanvas.addEventListener("pointerdown", startStroke);
  displayCanvas.addEventListener("pointermove", handleCanvasHover);
  displayCanvas.addEventListener("pointermove", continueStroke);
  displayCanvas.addEventListener("pointerup", finishStroke);
  displayCanvas.addEventListener("pointercancel", finishStroke);
  displayCanvas.addEventListener("pointerleave", clearCanvasHover);

  syncTrackScroll(timeline, backgroundTimeline);
  syncTrackScroll(backgroundTimeline, timeline);

  window.addEventListener("keydown", handleShortcut);
  window.addEventListener("pagehide", () => {
    void writeAutosaveSnapshot();
  });
}

// ════════════════════════════════════════
//  Chew Dialog System
// ════════════════════════════════════════

function showChewDialog({ frames = CHEW_FRAMES, text = "", actions = [] }) {
  if (!chewDialog) return;

  if (chewDialogText) chewDialogText.textContent = text;

  clearInterval(chewDialogAnimInterval);
  chewDialogAnimInterval = 0;
  let frameIndex = 0;
  if (chewDialogPortrait && frames.length > 0) {
    chewDialogPortrait.src = frames[0];
    if (frames.length > 1) {
      chewDialogAnimInterval = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        chewDialogPortrait.src = frames[frameIndex];
      }, 260);
    }
  }

  if (chewDialogActions) {
    chewDialogActions.innerHTML = "";
    actions.forEach(({ label, onClick }) => {
      const btn = document.createElement("button");
      btn.className = "chew-dialog__btn";
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        if (typeof onClick === "function") onClick();
      });
      chewDialogActions.append(btn);
    });
  }

  chewDialog.hidden = false;
}

function hideChewDialog() {
  if (!chewDialog) return;
  clearInterval(chewDialogAnimInterval);
  chewDialogAnimInterval = 0;
  chewDialog.hidden = true;
}

// ════════════════════════════════════════
//  TreeFort Instruction Files
// ════════════════════════════════════════

async function handleTreefortInstruction(data, fileName) {
  settleTransientState();
  stopPlayback();
  clearFloatingSelectionState();

  if (data.questPhase === "awaiting-key") {
    // .Parchment → Key Mode
    currentParchment = {
      guestId: data.guestId || "guest",
      guestName: data.guestName || "friend",
      questPhase: data.questPhase,
    };
    currentTreefortRoom = null;
    currentProjectFileName = `${data.guestName || "key"}.SpecialKey`;

    const initialBackground = createEmptyBackgroundClip();
    state.frames = [createEmptyFrame()];
    state.backgroundClips = [initialBackground];
    state.backgroundAssignments = [initialBackground.id];
    state.currentFrameIndex = 0;
    state.editTarget = "frame";
    state.soloTrack = null;
    stopPlayback();

    state.stamps = defaultStampSources.map((entry) => createStampEntry(entry));
    if (state.stamps.length > 0) state.activeStampId = state.stamps[0].id;
    await Promise.all(state.stamps.map((stampEntry) => loadStampEntry(stampEntry)));

    resetPointerState();
    resetHistoryWithCurrentState();
    autosaveArmed = true;
    await writeAutosaveSnapshot();
    refreshUI({ revealFrame: true, revealBackground: true });

    setStatus("Key mode: draw a key for your room!");

    const name = data.guestName || "friend";
    const parchmentMood = CHEW_FRAMES;
    const parchmentText = typeof data.chewMessage === "string" && data.chewMessage.trim().length > 0
      ? data.chewMessage
      : `Hey where did you get this? Who gave this to you? Was it Gum? Hmph. This parchment is meant for Keys. So. Go ahead and draw a key. But be careful! Unlike rooms, you only get one chance to draw your own key, and it will last forever. So take your time.`;
    showChewDialog({
      frames: parchmentMood,
      text: parchmentText,
      actions: [{ label: "Let's draw!", onClick: hideChewDialog }],
    });
    return;
  }

  if (data.questPhase === "awaiting-room" || data.questPhase === "bonus-room") {
    // .Room instruction → Room Mode
    currentParchment = null;
    const guestName = data.guestName || "friend";

    currentTreefortRoom = {
      schema: "treefort-room-hidden-meta",
      schemaVersion: 1,
      roomId: data.guestId || "guest-room",
      spaceId: data.spaceId || "main",
      roomMode: {
        active: true,
        singleFrameLocked: true,
        timelineEditable: false,
        gifToolsEnabled: false,
        showBackgroundNotice: true,
        backgroundNotice: "ROOM COLORS ARE NOT EDITABLE",
      },
    };
    currentProjectFileName = `${guestName}.room`;

    const initialBackground = createEmptyBackgroundClip();
    state.frames = [createEmptyFrame()];
    state.backgroundClips = [initialBackground];
    state.backgroundAssignments = [initialBackground.id];
    state.currentFrameIndex = 0;
    state.editTarget = "frame";
    state.soloTrack = null;
    stopPlayback();

    state.stamps = defaultStampSources.map((entry) => createStampEntry(entry));
    if (state.stamps.length > 0) state.activeStampId = state.stamps[0].id;
    await Promise.all(state.stamps.map((stampEntry) => loadStampEntry(stampEntry)));

    resetPointerState();
    resetHistoryWithCurrentState();
    autosaveArmed = true;
    await writeAutosaveSnapshot();
    refreshUI({ revealFrame: true, revealBackground: true });

    setStatus("Room mode: draw your room!");

    const isBonus = data.questPhase === "bonus-room";
    const chewMood = CHEW_FRAMES;
    const chewText = typeof data.chewMessage === "string" && data.chewMessage.trim().length > 0
      ? data.chewMessage
      : isBonus
        ? `I don't want to know. I promise not to look. Just draw what you need to draw.`
        : `I can't believe you got a Room! Wait where's your Key? Did you let Gum take it? Wow. Okay yeah start drawing I guess. Draw yourself a bed.`;
    showChewDialog({
      frames: chewMood,
      text: chewText,
      actions: [{ label: "Let's draw!", onClick: hideChewDialog }],
    });
    return;
  }
}

async function init() {
  decoratePanelHeadings();
  attachInstallEvents();
  attachLaunchQueueHandler();
  updateAutosaveAvailability();
  autosaveArmed = !autosaveAvailable;
  state.stamps = defaultStampSources.map((entry) => createStampEntry(entry));
  if (state.stamps.length > 0) {
    state.activeStampId = state.stamps[0].id;
  }
  const initialBackgroundClip = createEmptyBackgroundClip();
  state.frames = [createEmptyFrame()];
  state.backgroundClips = [initialBackgroundClip];
  state.backgroundAssignments = [initialBackgroundClip.id];
  attachEvents();
  renderStatus();
  refreshUI();
  await Promise.all(state.stamps.map((stampEntry) => loadStampEntry(stampEntry)));
  resetHistoryWithCurrentState();
  await registerServiceWorker();
  await applyLaunchAction();
  refreshUI();
}

init();
