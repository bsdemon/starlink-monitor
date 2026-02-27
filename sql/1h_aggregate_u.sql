CREATE MATERIALIZED VIEW IF NOT EXISTS starlink.telemetry_u_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', ts) AS bucket,
  device_id,

  avg(downlink_throughput_mbps) AS downlink_throughput_mbps_avg,
  max(downlink_throughput_mbps) AS downlink_throughput_mbps_max,

  avg(uplink_throughput_mbps)   AS uplink_throughput_mbps_avg,
  max(uplink_throughput_mbps)   AS uplink_throughput_mbps_max,

  avg(ping_drop_rate_avg)       AS ping_drop_rate_avg,
  avg(ping_latency_ms_avg)      AS ping_latency_ms_avg,

  avg(obstruction_percent_time) AS obstruction_percent_time_avg,
  max(obstruction_percent_time) AS obstruction_percent_time_max,

  max(uptime_s)                 AS uptime_s_max,
  avg(signal_quality)           AS signal_quality_avg,

  max(h3_cell_id)               AS h3_cell_id,

  -- if alerts  are present, count the number of rows with alerts, otherwise count 0
  count(*) FILTER (WHERE active_alerts IS NOT NULL AND cardinality(active_alerts) > 0) AS rows_with_alerts,
  count(*) AS samples
FROM starlink.telemetry_u
GROUP BY 1, 2;

CREATE INDEX IF NOT EXISTS telemetry_u_1h_device_bucket_idx
  ON starlink.telemetry_u_1h (device_id, bucket DESC);