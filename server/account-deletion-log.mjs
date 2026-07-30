/**
 * Append-only log of account deletions (reason + phone) for support/ops.
 * Survives when DB has no deletion_reason columns yet.
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const LOG_PATH = path.join(DATA_DIR, "account-deletions.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, JSON.stringify({ entries: [] }, null, 2));
  }
}

/**
 * @param {{
 *   userId: string,
 *   phone: string | null,
 *   displayName?: string | null,
 *   reasonCode: string,
 *   reasonLabel: string,
 *   reasonDetail: string | null,
 *   deletedAt: string,
 * }} entry
 */
export function logAccountDeletion(entry) {
  try {
    ensure();
    const data = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
    if (!Array.isArray(data.entries)) data.entries = [];
    data.entries.unshift({
      id: `del_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      ...entry,
    });
    // Cap file size
    if (data.entries.length > 5000) data.entries = data.entries.slice(0, 5000);
    fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn("[account-deletion-log]", err);
  }
}

export function listAccountDeletions(limit = 100) {
  try {
    ensure();
    const data = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
    return (data.entries || []).slice(0, limit);
  } catch {
    return [];
  }
}
