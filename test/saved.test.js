import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server.js";

async function withServer(run) {
  const dir = await mkdtemp(join(tmpdir(), "job-board-test-"));
  const savedJobsPath = join(dir, "saved-jobs.json");
  const server = createApp({ savedJobsPath });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl, savedJobsPath);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await rm(dir, { recursive: true, force: true });
  }
}

test("saved jobs API saves, lists, persists, deduplicates and removes jobs", async () => {
  await withServer(async (baseUrl, savedJobsPath) => {
    let response = await fetch(`${baseUrl}/api/saved`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);

    response = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).map((job) => job.id), ["j1"]);

    // Saving the same job again must not create another copy.
    response = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "j1" }),
    });
    assert.deepEqual((await response.json()).map((job) => job.id), ["j1"]);

    // The server-side JSON file is the source of persistence.
    assert.deepEqual(JSON.parse(await readFile(savedJobsPath, "utf8")), ["j1"]);
    response = await fetch(`${baseUrl}/api/saved`);
    assert.deepEqual((await response.json()).map((job) => job.id), ["j1"]);

    response = await fetch(`${baseUrl}/api/saved/j1`, { method: "DELETE" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
  });
});

test("saved jobs API returns clear errors for invalid and unknown jobs", async () => {
  await withServer(async (baseUrl) => {
    let response = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId: "does-not-exist" }),
    });
    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /Job not found/);

    response = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /jobId is required/);

    response = await fetch(`${baseUrl}/api/saved`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /valid JSON/);

    response = await fetch(`${baseUrl}/api/saved/not-a-job`, { method: "DELETE" });
    assert.equal(response.status, 404);
    assert.match((await response.json()).error, /Job not found/);
  });
});
