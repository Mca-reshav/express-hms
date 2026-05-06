export interface HeartbeatEvent {
  service: string;
  timestamp: string;
}

export interface Alert {
  service: string;
  alert_at: string;
}

export interface MonitorConfig {
  expected_interval_seconds: number;
  allowed_misses: number;
}

// validate
function isValidEvent(event: unknown): event is HeartbeatEvent {
  if (typeof event !== "object" || event === null) return false;
  const e = event as Record<string, unknown>;
  if (typeof e.service !== "string" || e.service.trim() === "") return false;
  if (typeof e.timestamp !== "string") return false;
  const date = new Date(e.timestamp);
  return !isNaN(date.getTime());
}

export function detectAlerts(
  rawEvents: unknown[],
  config: MonitorConfig
): Alert[] {
  const { expected_interval_seconds, allowed_misses } = config;

  // filter
  const validEvents = rawEvents.filter(isValidEvent);
  const byService = new Map<string, Date[]>();
  for (const event of validEvents) {
    if (!byService.has(event.service)) byService.set(event.service, []);
    byService.get(event.service)!.push(new Date(event.timestamp));
  }

  const alerts: Alert[] = [];

  for (const [service, timestamps] of byService) {
    timestamps.sort((a, b) => a.getTime() - b.getTime());

    const gapThresholdMs =
      expected_interval_seconds * (allowed_misses + 1) * 1000;

    let alertTriggered = false;

    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i].getTime() - timestamps[i - 1].getTime();

      if (gap >= gapThresholdMs) {
        const alertAt = new Date(
          timestamps[i - 1].getTime() + expected_interval_seconds * 1000
        );

        alerts.push({
          service,
          alert_at: alertAt.toISOString(),
        });

        alertTriggered = true;
        break;
      }
    }

    void alertTriggered;
  }

  return alerts;
}

const events: unknown[] = [
  { service: "email", timestamp: "2026-05-06T11:00:00Z" },
  { service: "email", timestamp: "2026-05-06T11:01:00Z" },
  { service: "email", timestamp: "2026-05-06T11:02:00Z" },
  { service: "email", timestamp: "2026-05-06T11:06:00Z" },
];

const config: MonitorConfig = {
  expected_interval_seconds: 60,
  allowed_misses: 3,
};

const result = detectAlerts(events, config);
console.log("Alerts:", JSON.stringify(result, null, 2));