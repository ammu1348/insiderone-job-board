# Job board starter

A small job board for an insiderOne work sample. It is made up: the jobs and
companies are not real.

## Run it

You need Node 20 or newer. There are no packages to install.

```
npm start      # then open http://localhost:3000
npm test       # runs the tests in test/
```

## What is here

- `server.js`: the web server and JSON API.
- `lib/jobs.js`: reading and searching the jobs. Pure functions.
- `lib/saved.js`: persistent saved-job ID operations.
- `jobs.json`: the sample jobs.
- `saved-jobs.json`: created automatically when the first job is saved.
- `public/`: the page, styles and browser script.
- `test/`: automated tests using Node's built-in test runner.

## Saved jobs feature

The page lets a user save a job, see their saved jobs on the same page, and
remove a job from the saved list. Saved job IDs are stored in `saved-jobs.json`
on the server, so they remain saved after a page refresh. Saving the same job
more than once does not create a duplicate. Unknown job IDs return a clear
404 error, and malformed or missing request data returns a 400 error.

### API

- `GET /api/saved` — returns the saved job objects.
- `POST /api/saved` — accepts JSON `{ "jobId": "j1" }` and saves that job.
- `DELETE /api/saved/:jobId` — removes that job from the saved list.

The existing `GET /api/jobs?q=` search endpoint is unchanged.
