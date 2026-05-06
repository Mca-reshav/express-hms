/// <reference types="node" />

import { detectAlerts, MonitorConfig } from "./main";

const config: MonitorConfig = {
  expected_interval_seconds: 60,
  allowed_misses: 3,
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL: ' + message);
    process.exitCode = 1;
  } else console.log('PASS: ' + message);
}

function runTest(name: string, fn: () => void) {
  console.log(`\n[TEST] ${name}`);
  fn();
}
const key = 'email', payKey = 'payments'
// 1
runTest("Alert case — 3 consecutive misses triggers alert", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { service: key, timestamp: "2026-05-06T11:01:00Z" },
    { service: key, timestamp: "2026-05-06T11:02:00Z" },
    { service: key, timestamp: "2026-05-06T11:06:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 1, "exactly one alert returned");
  assert(alerts[0].service === key, "alert is for email service");
  assert(
    alerts[0].alert_at === "2026-05-06T11:03:00.000Z",
    `alert_at is first missed heartbeat (got ${alerts[0]?.alert_at})`
  );
});

// 2
runTest("Near-miss case — only 2 missed heartbeats, no alert", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { service: key, timestamp: "2026-05-06T11:01:00Z" },
    { service: key, timestamp: "2026-05-06T11:04:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 0, "no alert for near-miss (2 misses only)");
});


// 3
runTest("Unordered input — events not in chronological order", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:06:00Z" },
    { service: key, timestamp: "2026-05-06T11:02:00Z" },
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { service: key, timestamp: "2026-05-06T11:01:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 1, "one alert despite unordered input");
  assert(
    alerts[0].alert_at === "2026-05-06T11:03:00.000Z",
    "correct alert_at after sorting"
  );
});

runTest("Malformed events — skipped without crashing", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { timestamp: "2026-05-06T11:01:00Z" },
    { service: key },
    { service: "", timestamp: "2026-05-06T11:02:00Z" },
    { service: key, timestamp: "not-a-date" },
    { service: key, timestamp: "2026-05-06T11:06:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 1, "alert triggered from only valid events");
  assert(
    alerts[0].alert_at === "2026-05-06T11:01:00.000Z",
    `alert_at is one interval after last valid heartbeat (got ${alerts[0]?.alert_at})`
  );
});

// 4
runTest("Multiple services — only failing service triggers alert", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { service: key, timestamp: "2026-05-06T11:06:00Z" },
    { service: payKey, timestamp: "2026-05-06T11:00:00Z" },
    { service: payKey, timestamp: "2026-05-06T11:01:00Z" },
    { service: payKey, timestamp: "2026-05-06T11:02:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 1, "only one alert total");
  assert(alerts[0].service === key, "alert is for email, not payments");
});

// last
runTest("One alert per service — no duplicate alerts", () => {
  const events = [
    { service: key, timestamp: "2026-05-06T11:00:00Z" },
    { service: key, timestamp: "2026-05-06T11:06:00Z" },
    { service: key, timestamp: "2026-05-06T11:14:00Z" },
  ];

  const alerts = detectAlerts(events, config);

  assert(alerts.length === 1, "only one alert even with multiple large gaps");
});

console.log("\nDone.\n");