/*
 * Project Intermesh — lightweight run-log analytics.
 *
 * Design goals:
 *   - No backend required. Events buffer in localStorage so a player can
 *     export their own run log as JSON (class-submission workflow).
 *   - If window.INTERMESH_ANALYTICS_ENDPOINT is set, the buffer is also
 *     shipped to that URL (best-effort, via navigator.sendBeacon) at
 *     run_ended and on page unload. No PII is captured.
 *   - Safe no-ops if localStorage is unavailable (private-mode Safari etc.).
 */

(function initAnalytics(global) {
  const STORAGE_KEY = "project-intermesh-runs";
  const SCHEMA_VERSION = 1;
  const MAX_BUFFERED_RUNS = 50;

  function safeStorage() {
    try {
      const probe = "__intermesh_probe__";
      global.localStorage.setItem(probe, "1");
      global.localStorage.removeItem(probe);
      return global.localStorage;
    } catch (err) {
      return null;
    }
  }

  function uuid() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    const r = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
    return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
  }

  const storage = safeStorage();

  function readAllRuns() {
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeAllRuns(runs) {
    if (!storage) return;
    try {
      const trimmed = runs.slice(-MAX_BUFFERED_RUNS);
      storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      // Quota errors are ignored; analytics must never break gameplay.
    }
  }

  const cohort = (() => {
    try {
      const params = new global.URLSearchParams(global.location.search);
      const fromQuery = params.get("cohort");
      if (fromQuery) return fromQuery.slice(0, 32);
    } catch (err) {}
    return global.INTERMESH_COHORT || "open";
  })();

  const session = {
    runId: null,
    startedAt: null,
    events: [],
  };

  function pushEvent(type, payload) {
    if (!session.runId) return;
    session.events.push({
      type,
      at: new Date().toISOString(),
      ...payload,
    });
  }

  function runRecord(finalPayload) {
    return {
      schema: SCHEMA_VERSION,
      run_id: session.runId,
      cohort,
      theme: (global.document && global.document.body && global.document.body.dataset.theme) || "green",
      user_agent_family: inferUserAgent(),
      started_at: session.startedAt,
      ended_at: finalPayload ? new Date().toISOString() : null,
      events: session.events.slice(),
      summary: finalPayload || null,
    };
  }

  function inferUserAgent() {
    const ua = (global.navigator && global.navigator.userAgent) || "";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Edg\//.test(ua)) return "edge";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Safari\//.test(ua)) return "safari";
    return "other";
  }

  function shipRun(record) {
    const endpoint = global.INTERMESH_ANALYTICS_ENDPOINT;
    if (!endpoint) return;
    try {
      const blob = new global.Blob([JSON.stringify(record)], { type: "application/json" });
      if (global.navigator && typeof global.navigator.sendBeacon === "function") {
        global.navigator.sendBeacon(endpoint, blob);
        return;
      }
      global.fetch(endpoint, {
        method: "POST",
        body: blob,
        keepalive: true,
        headers: { "content-type": "application/json" },
      }).catch(() => {});
    } catch (err) {
      // Swallow; analytics must never break gameplay.
    }
  }

  const Analytics = {
    SCHEMA_VERSION,

    runStarted(meta) {
      session.runId = uuid();
      session.startedAt = new Date().toISOString();
      session.events = [];
      pushEvent("run_started", { meta: meta || {} });
    },

    workbenchCommitted(selections, cartTotal, budgetAfter) {
      pushEvent("workbench_committed", {
        hardware: selections.hardware,
        nodes_purchased: selections.nodes,
        weatherproof_cases: selections.cases,
        solar_panels: selections.solar,
        cat_carrier: selections.catCarrier === "yes",
        firmware: selections.firmware,
        cart_total: cartTotal,
        budget_after: budgetAfter,
      });
    },

    locationResolved(locationKey, delta) {
      pushEvent("location_resolved", {
        location: locationKey,
        ...delta,
      });
    },

    diagnosticTriggered(info) {
      pushEvent("diagnostic_triggered", info || {});
    },

    mutualAidResolved(info) {
      pushEvent("mutual_aid_resolved", info || {});
    },

    runEnded(summary) {
      if (!session.runId) return null;
      pushEvent("run_ended", summary);
      const record = runRecord(summary);
      const runs = readAllRuns();
      runs.push(record);
      writeAllRuns(runs);
      shipRun(record);
      const finished = { ...session, record };
      session.runId = null;
      session.startedAt = null;
      session.events = [];
      return finished.record;
    },

    getAllRuns() {
      return readAllRuns();
    },

    clearRuns() {
      writeAllRuns([]);
    },

    exportRunsAsJson() {
      const runs = readAllRuns();
      return JSON.stringify(
        {
          schema: SCHEMA_VERSION,
          exported_at: new Date().toISOString(),
          cohort,
          run_count: runs.length,
          runs,
        },
        null,
        2
      );
    },
  };

  global.addEventListener("pagehide", () => {
    if (!session.runId) return;
    const record = runRecord(null);
    shipRun(record);
  });

  global.IntermeshAnalytics = Analytics;
})(window);
