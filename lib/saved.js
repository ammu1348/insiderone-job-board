// Persistent saved-job storage. Only job IDs are stored; job details come from jobs.json.
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

async function readIds(path) {
  try {
    const raw = await readFile(path, "utf8");
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
      throw new Error("Saved jobs file must contain an array of job IDs");
    }
    return ids;
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeIds(path, ids) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(ids, null, 2)}\n`, "utf8");
  await rename(tempPath, path);
}

/** Read saved job IDs from the JSON file. */
export function loadSavedIds(path) {
  return readIds(path);
}

/** Add a job ID once. Returns the updated list of IDs. */
export async function addSavedId(path, jobId) {
  const ids = await readIds(path);
  if (!ids.includes(jobId)) {
    ids.push(jobId);
    await writeIds(path, ids);
  }
  return ids;
}

/** Remove a saved job ID. Returns the updated list of IDs. */
export async function removeSavedId(path, jobId) {
  const ids = await readIds(path);
  const updated = ids.filter((id) => id !== jobId);
  if (updated.length !== ids.length) await writeIds(path, updated);
  return updated;
}
