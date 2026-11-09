// A small job board: a JSON API and one page. Run with `npm start`.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import { loadJobs, searchJobs, findJob } from "./lib/jobs.js";
import { loadSavedIds, addSavedId, removeSavedId } from "./lib/saved.js";

const PORT = Number(process.env.PORT ?? 3000);
const DEFAULT_SAVED_PATH = fileURLToPath(new URL("./saved-jobs.json", import.meta.url));

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readRequestJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) {
      const err = new Error("Request body is too large");
      err.status = 413;
      throw err;
    }
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    const err = new Error("Request body must be valid JSON");
    err.status = 400;
    throw err;
  }
}

export function createApp({ savedJobsPath = DEFAULT_SAVED_PATH } = {}) {
  // Serialize file mutations so simultaneous save/remove requests cannot overwrite each other.
  let mutationQueue = Promise.resolve();
  const mutate = (operation) => {
    const result = mutationQueue.then(operation);
    mutationQueue = result.catch(() => {});
    return result;
  };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");

      if (req.method === "GET" && url.pathname === "/api/jobs") {
        const jobs = await loadJobs();
        return sendJson(res, 200, searchJobs(jobs, url.searchParams.get("q")));
      }

      if (req.method === "GET" && url.pathname === "/api/saved") {
        const [jobs, ids] = await Promise.all([loadJobs(), loadSavedIds(savedJobsPath)]);
        const saved = ids.map((id) => findJob(jobs, id)).filter(Boolean);
        return sendJson(res, 200, saved);
      }

      if (req.method === "POST" && url.pathname === "/api/saved") {
        const body = await readRequestJson(req);
        if (typeof body.jobId !== "string" || !body.jobId.trim()) {
          return sendJson(res, 400, { error: "A valid jobId is required" });
        }
        const jobs = await loadJobs();
        const job = findJob(jobs, body.jobId);
        if (!job) return sendJson(res, 404, { error: `Job not found: ${body.jobId}` });
        await mutate(() => addSavedId(savedJobsPath, job.id));
        const ids = await loadSavedIds(savedJobsPath);
        return sendJson(res, 200, ids.map((id) => findJob(jobs, id)).filter(Boolean));
      }

      const deleteMatch = url.pathname.match(/^\/api\/saved\/([^/]+)$/);
      if (req.method === "DELETE" && deleteMatch) {
        const jobId = decodeURIComponent(deleteMatch[1]);
        const jobs = await loadJobs();
        if (!findJob(jobs, jobId)) {
          return sendJson(res, 404, { error: `Job not found: ${jobId}` });
        }
        await mutate(() => removeSavedId(savedJobsPath, jobId));
        const ids = await loadSavedIds(savedJobsPath);
        return sendJson(res, 200, ids.map((id) => findJob(jobs, id)).filter(Boolean));
      }

      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/app.js" || url.pathname === "/styles.css")) {
        const files = { "/": "index.html", "/app.js": "app.js", "/styles.css": "styles.css" };
        const file = files[url.pathname];
        const body = await readFile(new URL(`./public/${file}`, import.meta.url));
        const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : "text/javascript";
        res.writeHead(200, { "content-type": `${type}; charset=utf-8` });
        return res.end(body);
      }

      return sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      if (err.status) return sendJson(res, err.status, { error: err.message });
      console.error(err);
      return sendJson(res, 500, { error: "Something went wrong" });
    }
  });
}

// Started directly (npm start), not imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createApp().listen(PORT, () => console.log(`Job board on http://localhost:${PORT}`));
}
