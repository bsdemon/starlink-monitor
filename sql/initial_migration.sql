CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS starlink;

CREATE TABLE IF NOT EXISTS starlink.telemetry_u (
  ts                  timestamptz NOT NULL,
  device_id            text        NOT NULL,
  device_type          char(1)     NOT NULL DEFAULT 'u',

  downlink_throughput_mbps          double precision NULL,
  uplink_throughput_mbps            double precision NULL,
  ping_drop_rate_avg                double precision NULL,
  ping_latency_ms_avg               double precision NULL,
  obstruction_percent_time           double precision NULL,
  uptime_s                           integer NULL,
  signal_quality                     double precision NULL,
  h3_cell_id                         bigint NULL,
  seconds_until_swupdate_reboot_possible integer NULL,
  running_software_version           text NULL,

  active_alerts                      integer[] NULL,

  utc_timestamp_ns                   bigint NOT NULL
);

SELECT create_hypertable('starlink.telemetry_u', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_u_device_ts_idx
  ON starlink.telemetry_u (device_id, ts DESC);



CREATE TABLE IF NOT EXISTS starlink.telemetry_r (
  ts                  timestamptz NOT NULL,
  device_id            text        NOT NULL,
  device_type          char(1)     NOT NULL DEFAULT 'r',

  wifi_uptime_s                integer NULL,
  wifi_software_version        text NULL,
  wifi_hardware_version        text NULL,
  wifi_is_repeater             boolean NULL,
  wifi_hops_from_controller    integer NULL,
  wifi_is_bypassed             boolean NULL,

  internet_ping_drop_rate      double precision NULL,
  internet_ping_latency_ms     double precision NULL,
  wifi_pop_ping_drop_rate      double precision NULL,
  wifi_pop_ping_latency_ms     double precision NULL,
  dish_ping_drop_rate          double precision NULL,
  dish_ping_latency_ms         double precision NULL,

  clients                      integer NULL,
  clients_2ghz                  integer NULL,
  clients_5ghz                  integer NULL,
  clients_eth                   integer NULL,

  wan_rx_bytes                  bigint NULL,
  wan_tx_bytes                  bigint NULL,

  dish_id                       text NULL,
  active_alerts                 integer[] NULL,

  utc_timestamp_ns              bigint NOT NULL
);

SELECT create_hypertable('starlink.telemetry_r', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_r_device_ts_idx
  ON starlink.telemetry_r (device_id, ts DESC);



CREATE TABLE IF NOT EXISTS starlink.telemetry_i (
  ts                  timestamptz NOT NULL,
  device_id            text        NOT NULL,
  device_type          char(1)     NOT NULL DEFAULT 'i',

  ipv4        inet NULL,
  ipv6_ue     inet NULL,
  ipv6_cpe    inet NULL,

  utc_timestamp_ns bigint NOT NULL
);

SELECT create_hypertable('starlink.telemetry_i', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_i_device_ts_idx
  ON starlink.telemetry_i (device_id, ts DESC);

SELECT add_retention_policy('starlink.telemetry_u', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('starlink.telemetry_r', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_retention_policy('starlink.telemetry_i', INTERVAL '30 days', if_not_exists => TRUE);
