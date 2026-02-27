CREATE MATERIALIZED VIEW IF NOT EXISTS starlink.telemetry_r_1h
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', ts) AS bucket,
  device_id,

  -- Ping / latency
  avg(internet_ping_drop_rate)  AS internet_ping_drop_rate_avg,
  avg(internet_ping_latency_ms) AS internet_ping_latency_ms_avg,
  max(internet_ping_latency_ms) AS internet_ping_latency_ms_max,

  avg(wifi_pop_ping_drop_rate)  AS wifi_pop_ping_drop_rate_avg,
  avg(wifi_pop_ping_latency_ms) AS wifi_pop_ping_latency_ms_avg,
  max(wifi_pop_ping_latency_ms) AS wifi_pop_ping_latency_ms_max,

  avg(dish_ping_drop_rate)      AS dish_ping_drop_rate_avg,
  avg(dish_ping_latency_ms)     AS dish_ping_latency_ms_avg,
  max(dish_ping_latency_ms)     AS dish_ping_latency_ms_max,

  avg(clients)      AS clients_avg,
  max(clients)      AS clients_max,
  avg(clients_2ghz) AS clients_2ghz_avg,
  avg(clients_5ghz) AS clients_5ghz_avg,
  avg(clients_eth)  AS clients_eth_avg,

  -- Uptime / versions / topology /  last time
  -- NOTE: Timescale provides "last(value, time)" aggregate.
  last(wifi_uptime_s, ts)             AS wifi_uptime_s_last,
  last(wifi_software_version, ts)     AS wifi_software_version_last,
  last(wifi_hardware_version, ts)     AS wifi_hardware_version_last,
  last(wifi_is_repeater, ts)          AS wifi_is_repeater_last,
  last(wifi_hops_from_controller, ts) AS wifi_hops_from_controller_last,
  last(wifi_is_bypassed, ts)          AS wifi_is_bypassed_last,
  last(dish_id, ts)                   AS dish_id_last,

  -- WAN bytes: delta 1h
  (last(wan_rx_bytes, ts) - first(wan_rx_bytes, ts)) AS wan_rx_bytes_delta,
  (last(wan_tx_bytes, ts) - first(wan_tx_bytes, ts)) AS wan_tx_bytes_delta,

  -- count alarms  
  count(*) FILTER (WHERE active_alerts IS NOT NULL AND cardinality(active_alerts) > 0) AS rows_with_alerts,

  count(*) AS samples
FROM starlink.telemetry_r
GROUP BY 1, 2;

CREATE INDEX IF NOT EXISTS telemetry_r_1h_device_bucket_idx
  ON starlink.telemetry_r_1h (device_id, bucket DESC);