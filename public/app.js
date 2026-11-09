const jobsList = document.getElementById("jobs");
const savedList = document.getElementById("saved-jobs");
const search = document.getElementById("search");
const jobCount = document.getElementById("job-count");
const savedCount = document.getElementById("saved-count");
const emptyJobs = document.getElementById("empty-jobs");
const emptySaved = document.getElementById("empty-saved");
const status = document.getElementById("status");

let savedIds = new Set();

function formatStipend(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")} / month`;
}

function makeJobCard(job, isSaved) {
  const li = document.createElement("li");
  li.className = "job-card";

  const companyLine = document.createElement("div");
  companyLine.className = "company-line";
  const company = document.createElement("span");
  company.className = "company";
  company.textContent = job.company;
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = job.location === "Remote" ? "Remote" : "On-site";
  companyLine.append(company, tag);

  const title = document.createElement("h3");
  title.textContent = job.title;
  const details = document.createElement("p");
  details.className = "details";
  details.textContent = job.location;

  const bottom = document.createElement("div");
  bottom.className = "card-bottom";
  const stipend = document.createElement("span");
  stipend.className = "stipend";
  stipend.textContent = formatStipend(job.stipend);

  const button = document.createElement("button");
  button.type = "button";
  button.className = isSaved ? "action remove" : "action";
  button.textContent = isSaved ? "Remove saved" : "☆ Save job";
  button.setAttribute("aria-label", `${isSaved ? "Remove" : "Save"} ${job.title}`);
  button.addEventListener("click", () => isSaved ? removeJob(job.id) : saveJob(job.id));

  bottom.append(stipend, button);
  li.append(companyLine, title, details, bottom);
  return li;
}

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

async function loadSaved() {
  const savedJobs = await request("/api/saved");
  savedIds = new Set(savedJobs.map((job) => job.id));
  renderSaved(savedJobs);
}

function renderSaved(savedJobs) {
  savedList.replaceChildren(...savedJobs.map((job) => makeJobCard(job, true)));
  savedCount.textContent = String(savedJobs.length);
  emptySaved.classList.toggle("hidden", savedJobs.length > 0);
}

async function saveJob(jobId) {
  try {
    const savedJobs = await request("/api/saved", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    savedIds = new Set(savedJobs.map((job) => job.id));
    renderSaved(savedJobs);
    await showJobs(search.value);
    status.textContent = "Job saved.";
  } catch (error) {
    status.textContent = error.message;
    alert(error.message);
  }
}

async function removeJob(jobId) {
  try {
    const savedJobs = await request(`/api/saved/${encodeURIComponent(jobId)}`, { method: "DELETE" });
    savedIds = new Set(savedJobs.map((job) => job.id));
    renderSaved(savedJobs);
    await showJobs(search.value);
    status.textContent = "Job removed from saved jobs.";
  } catch (error) {
    status.textContent = error.message;
    alert(error.message);
  }
}

async function showJobs(query = "") {
  try {
    const jobs = await request(`/api/jobs?q=${encodeURIComponent(query)}`);
    jobsList.replaceChildren(...jobs.map((job) => makeJobCard(job, savedIds.has(job.id))));
    jobCount.textContent = `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"}`;
    emptyJobs.classList.toggle("hidden", jobs.length > 0);
  } catch (error) {
    jobsList.replaceChildren();
    emptyJobs.textContent = error.message;
    emptyJobs.classList.remove("hidden");
  }
}

search.addEventListener("input", () => showJobs(search.value));

async function init() {
  try {
    await loadSaved();
    await showJobs();
  } catch (error) {
    status.textContent = error.message;
    emptySaved.textContent = "Saved jobs could not be loaded. Please refresh the page.";
  }
}

init();
