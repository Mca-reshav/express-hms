# HMS

A simple heartbeat monitoring system that detects when a service misses 3 consecutive heartbeats and triggers an alert.

---
## Setup

```bash
npm install
```

---
## Run the main solution

```bash
npm start
```

This runs `src/main.ts` with the built-in example (email service, 4-minute gap → alert at 11:03).

---

## Run the tests

```bash
npm test
```

All test cases print `PASS` or `FAIL` with a description.