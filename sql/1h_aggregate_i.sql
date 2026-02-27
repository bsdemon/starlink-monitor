CREATE MATERIALIZED VIEW IF NOT EXISTS starlink.telemetry_i_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', ts) AS bucket,
  device_id,

  last(ipv4, ts)     AS ipv4_last,
  last(ipv6_ue, ts)  AS ipv6_ue_last,
  last(ipv6_cpe, ts) AS ipv6_cpe_last,

  count(*) AS samples
FROM starlink.telemetry_i
GROUP BY 1, 2;

CREATE INDEX IF NOT EXISTS telemetry_i_1h_device_bucket_idx
  ON starlink.telemetry_i_1h (device_id, bucket DESC);