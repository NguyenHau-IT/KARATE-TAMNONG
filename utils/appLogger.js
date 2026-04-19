function toIsoNow() {
  return new Date().toISOString();
}

const DEFAULT_METRICS_WINDOW_MINUTES = 60;
const metricsWindowMinutesRaw = Number.parseInt(process.env.APP_LOG_METRICS_WINDOW_MINUTES || '', 10);
const metricsWindowMinutes = Number.isNaN(metricsWindowMinutesRaw) || metricsWindowMinutesRaw <= 0
  ? DEFAULT_METRICS_WINDOW_MINUTES
  : metricsWindowMinutesRaw;
const metricsWindowMs = metricsWindowMinutes * 60 * 1000;
const metricsBuckets = new Map();

function getMinuteBucketKey(isoTimestamp) {
  return (isoTimestamp || toIsoNow()).slice(0, 16);
}

function toMinuteLabel(minuteKey) {
  return `${minuteKey}:00.000Z`;
}

function cleanExpiredBuckets(referenceTimeMs) {
  const threshold = referenceTimeMs - metricsWindowMs;

  for (const [bucketKey, bucket] of metricsBuckets.entries()) {
    if (bucket.bucketMs < threshold) {
      metricsBuckets.delete(bucketKey);
    }
  }
}

function recordMetric(entry) {
  const nowMs = Date.now();
  const minuteKey = getMinuteBucketKey(entry.timestamp);
  const compositeKey = [minuteKey, entry.event, entry.module, entry.action, entry.status].join('|');
  const existing = metricsBuckets.get(compositeKey);

  if (existing) {
    existing.count += 1;
    cleanExpiredBuckets(nowMs);
    return;
  }

  metricsBuckets.set(compositeKey, {
    minuteKey,
    bucketMs: Date.parse(toMinuteLabel(minuteKey)),
    event: entry.event,
    module: entry.module,
    action: entry.action,
    status: entry.status,
    count: 1
  });

  cleanExpiredBuckets(nowMs);
}

function getLogMetricsSnapshot(options) {
  const input = options && typeof options === 'object' ? options : {};
  const lastMinutesRaw = Number.parseInt(input.lastMinutes, 10);
  const lastMinutes = Number.isNaN(lastMinutesRaw) || lastMinutesRaw <= 0
    ? 15
    : Math.min(lastMinutesRaw, metricsWindowMinutes);
  const nowMs = Date.now();
  const threshold = nowMs - (lastMinutes * 60 * 1000);

  cleanExpiredBuckets(nowMs);

  const series = [];
  const summary = {
    total: 0,
    byStatus: {}
  };

  for (const bucket of metricsBuckets.values()) {
    if (bucket.bucketMs < threshold) {
      continue;
    }

    series.push({
      minute: toMinuteLabel(bucket.minuteKey),
      event: bucket.event,
      module: bucket.module,
      action: bucket.action,
      status: bucket.status,
      count: bucket.count
    });

    summary.total += bucket.count;
    summary.byStatus[bucket.status] = (summary.byStatus[bucket.status] || 0) + bucket.count;
  }

  series.sort(function(a, b) {
    if (a.minute < b.minute) {
      return -1;
    }

    if (a.minute > b.minute) {
      return 1;
    }

    return 0;
  });

  return {
    windowMinutes: lastMinutes,
    generatedAt: toIsoNow(),
    summary,
    series
  };
}

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return {};
  }

  return meta;
}

function write(level, payload) {
  const body = payload && typeof payload === 'object' ? payload : {};

  const entry = {
    timestamp: toIsoNow(),
    level,
    event: body.event || 'application_event',
    module: body.module || 'app',
    action: body.action || 'unknown_action',
    status: body.status || 'unknown',
    requestId: body.requestId || null,
    actor: body.actor || null,
    meta: sanitizeMeta(body.meta)
  };

  recordMetric(entry);
  console.log(JSON.stringify(entry));
}

function logInfo(payload) {
  write('info', payload);
}

function logWarn(payload) {
  write('warn', payload);
}

function logError(payload) {
  write('error', payload);
}

module.exports = {
  logInfo,
  logWarn,
  logError,
  getLogMetricsSnapshot
};
