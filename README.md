## Technical decisions

I chose server-side JSON file persistence to keep the application simple and avoid external database dependencies.

The application stores only saved job IDs instead of duplicating complete job records. Job details are retrieved from the existing jobs file.

## What I would improve next

- Add user authentication so each user can maintain their own saved jobs.
- Introduce SQLite or PostgreSQL for scalable storage.
- Improve frontend loading, success and error states.
- Add more automated tests for edge cases.
