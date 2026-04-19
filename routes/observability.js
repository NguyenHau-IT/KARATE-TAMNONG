const express = require('express');
const { getLogMetricsSnapshot } = require('../utils/appLogger');

const router = express.Router();

const DEFAULT_ALERT_WINDOW_MINUTES = 5;

function readThresholdFromEnv(envName, defaultValue) {
  const raw = Number.parseInt(process.env[envName] || '', 10);

  if (Number.isNaN(raw) || raw < 0) {
    return defaultValue;
  }

  return raw;
}

const ALERT_THRESHOLDS = {
  failed: {
    warning: readThresholdFromEnv('OBS_ALERT_FAILED_WARNING', 5),
    critical: readThresholdFromEnv('OBS_ALERT_FAILED_CRITICAL', 15)
  },
  conflict: {
    warning: readThresholdFromEnv('OBS_ALERT_CONFLICT_WARNING', 10),
    critical: readThresholdFromEnv('OBS_ALERT_CONFLICT_CRITICAL', 30)
  }
};

function normalizeThresholds(thresholds) {
  const failedWarning = Math.max(0, thresholds.failed.warning);
  const failedCritical = Math.max(failedWarning, thresholds.failed.critical);
  const conflictWarning = Math.max(0, thresholds.conflict.warning);
  const conflictCritical = Math.max(conflictWarning, thresholds.conflict.critical);

  return {
    failed: {
      warning: failedWarning,
      critical: failedCritical
    },
    conflict: {
      warning: conflictWarning,
      critical: conflictCritical
    }
  };
}

function evaluateAlertStatus(snapshot, thresholds) {
  const counts = {
    failed: snapshot && snapshot.summary && snapshot.summary.byStatus ? (snapshot.summary.byStatus.failed || 0) : 0,
    conflict: snapshot && snapshot.summary && snapshot.summary.byStatus ? (snapshot.summary.byStatus.conflict || 0) : 0,
    total: snapshot && snapshot.summary ? (snapshot.summary.total || 0) : 0
  };

  const reasons = [];
  let status = 'ok';

  if (counts.failed >= thresholds.failed.critical) {
    status = 'critical';
    reasons.push(`failed >= critical (${counts.failed}/${thresholds.failed.critical})`);
  } else if (counts.failed >= thresholds.failed.warning) {
    status = 'warning';
    reasons.push(`failed >= warning (${counts.failed}/${thresholds.failed.warning})`);
  }

  if (counts.conflict >= thresholds.conflict.critical) {
    status = 'critical';
    reasons.push(`conflict >= critical (${counts.conflict}/${thresholds.conflict.critical})`);
  } else if (status !== 'critical' && counts.conflict >= thresholds.conflict.warning) {
    status = 'warning';
    reasons.push(`conflict >= warning (${counts.conflict}/${thresholds.conflict.warning})`);
  }

  return {
    status,
    reasons,
    counts
  };
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

router.get('/log-metrics', function(req, res) {
  const lastMinutes = parsePositiveInt(req.query.last_minutes);
  const snapshot = getLogMetricsSnapshot({
    lastMinutes: lastMinutes || 15
  });

  return res.json({
    success: true,
    data: snapshot
  });
});

function buildHealthResponse(req) {
  const queryMinutes = parsePositiveInt(req.query.last_minutes);
  const envWindow = readThresholdFromEnv('OBS_ALERT_WINDOW_MINUTES', DEFAULT_ALERT_WINDOW_MINUTES);
  const windowMinutes = queryMinutes || envWindow;
  const snapshot = getLogMetricsSnapshot({
    lastMinutes: windowMinutes
  });
  const thresholds = normalizeThresholds(ALERT_THRESHOLDS);
  const evaluation = evaluateAlertStatus(snapshot, thresholds);

  return {
    success: true,
    data: {
      status: evaluation.status,
      generatedAt: snapshot.generatedAt,
      windowMinutes: snapshot.windowMinutes,
      thresholds,
      counts: evaluation.counts,
      reasons: evaluation.reasons,
      summary: snapshot.summary
    }
  };
}

router.get('/health', function(req, res) {
  return res.json(buildHealthResponse(req));
});

router.get('/alert-status', function(req, res) {
  return res.json(buildHealthResponse(req));
});

module.exports = router;
