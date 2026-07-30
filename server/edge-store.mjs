/**
 * Persist edge gateway state across process restarts.
 * Path: EDGE_STATE_PATH or .data/edge-state.json
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();

const STATE_PATH =
  process.env.EDGE_STATE_PATH ||
  path.resolve(process.cwd(), ".data", "edge-state.json");

let writeTimer = null;

export function getEdgeStatePath() {
  return STATE_PATH;
}

export function loadEdgeState() {
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch (err) {
    console.warn("[edge-store] load failed:", err?.message || err);
    return null;
  }
}

/**
 * @param {object} snapshot
 */
export function saveEdgeState(snapshot) {
  try {
    const dir = path.dirname(STATE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${STATE_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(snapshot, null, 0), "utf8");
    fs.renameSync(tmp, STATE_PATH);
  } catch (err) {
    console.warn("[edge-store] save failed:", err?.message || err);
  }
}

/** Debounced save so hot paths don't thrash disk. */
export function scheduleSaveEdgeState(getSnapshot, ms = 800) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      saveEdgeState(getSnapshot());
    } catch {
      /* */
    }
  }, ms);
}
