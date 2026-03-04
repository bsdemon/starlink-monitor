from __future__ import annotations

from django.db import models
from django.contrib.postgres.fields import ArrayField
from timescale.db.models.fields import TimescaleDateTimeField
from timescale.db.models.managers import TimescaleManager


class TimescaleModel(models.Model):
    """
    A helper class for using Timescale within Django, has the TimescaleManager and 
    TimescaleDateTimeField already present. This is an abstract class it should 
    be inheritted by another class for use.
    """
    ts = TimescaleDateTimeField(interval="1 day")

    objects = models.Manager()
    timescale = TimescaleManager()
    

    class Meta:
        abstract = True


class TelemetryU(TimescaleModel):
    device_id = models.TextField(db_index=True)
    device_type = models.TextField(default="u")

    downlink_throughput_mbps = models.FloatField(null=True, blank=True)
    uplink_throughput_mbps = models.FloatField(null=True, blank=True)
    ping_drop_rate_avg = models.FloatField(null=True, blank=True)
    ping_latency_ms_avg = models.FloatField(null=True, blank=True)
    obstruction_percent_time = models.FloatField(null=True, blank=True)
    uptime_s = models.IntegerField(null=True, blank=True)
    signal_quality = models.FloatField(null=True, blank=True)
    h3_cell_id = models.BigIntegerField(null=True, blank=True)
    seconds_until_swupdate_reboot_possible = models.IntegerField(null=True, blank=True)
    running_software_version = models.TextField(null=True, blank=True)

    active_alerts = ArrayField(models.IntegerField(), null=True, blank=True)

    utc_timestamp_ns = models.BigIntegerField()

    ut_lat = models.FloatField(null=True, blank=True)
    ut_lon = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "telemetry_u"
        indexes = [
            # Equivalent of (device_id, ts DESC)
            models.Index(fields=["device_id", "-ts"], name="telemetry_u_dev_ts_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(device_type__in=["u", "r", "i"]),
                name="telemetry_u_device_type_allowed",
            )
        ]

    def __str__(self) -> str:
        return f"U {self.device_id} @ {self.ts.isoformat()}"


class TelemetryR(TimescaleModel):
    device_id = models.TextField(db_index=True)
    device_type = models.TextField(default="r")

    wifi_uptime_s = models.IntegerField(null=True, blank=True)
    wifi_software_version = models.TextField(null=True, blank=True)
    wifi_hardware_version = models.TextField(null=True, blank=True)
    wifi_is_repeater = models.BooleanField(null=True, blank=True)
    wifi_hops_from_controller = models.IntegerField(null=True, blank=True)
    wifi_is_bypassed = models.BooleanField(null=True, blank=True)

    internet_ping_drop_rate = models.FloatField(null=True, blank=True)
    internet_ping_latency_ms = models.FloatField(null=True, blank=True)
    wifi_pop_ping_drop_rate = models.FloatField(null=True, blank=True)
    wifi_pop_ping_latency_ms = models.FloatField(null=True, blank=True)
    dish_ping_drop_rate = models.FloatField(null=True, blank=True)
    dish_ping_latency_ms = models.FloatField(null=True, blank=True)

    clients = models.IntegerField(null=True, blank=True)
    clients_2ghz = models.IntegerField(null=True, blank=True)
    clients_5ghz = models.IntegerField(null=True, blank=True)
    clients_eth = models.IntegerField(null=True, blank=True)

    wan_rx_bytes = models.BigIntegerField(null=True, blank=True)
    wan_tx_bytes = models.BigIntegerField(null=True, blank=True)

    # Per-band client rates (Mbps)
    clients_2ghz_rx_rate_mbps_min = models.FloatField(null=True, blank=True)
    clients_2ghz_rx_rate_mbps_max = models.FloatField(null=True, blank=True)
    clients_2ghz_rx_rate_mbps_avg = models.FloatField(null=True, blank=True)

    clients_5ghz_rx_rate_mbps_min = models.FloatField(null=True, blank=True)
    clients_5ghz_rx_rate_mbps_max = models.FloatField(null=True, blank=True)
    clients_5ghz_rx_rate_mbps_avg = models.FloatField(null=True, blank=True)

    clients_2ghz_tx_rate_mbps_min = models.FloatField(null=True, blank=True)
    clients_2ghz_tx_rate_mbps_max = models.FloatField(null=True, blank=True)
    clients_2ghz_tx_rate_mbps_avg = models.FloatField(null=True, blank=True)

    clients_5ghz_tx_rate_mbps_min = models.FloatField(null=True, blank=True)
    clients_5ghz_tx_rate_mbps_max = models.FloatField(null=True, blank=True)
    clients_5ghz_tx_rate_mbps_avg = models.FloatField(null=True, blank=True)

    # Per-band client signal strength
    clients_2ghz_signal_strength_min = models.FloatField(null=True, blank=True)
    clients_2ghz_signal_strength_max = models.FloatField(null=True, blank=True)
    clients_2ghz_signal_strength_avg = models.FloatField(null=True, blank=True)

    clients_5ghz_signal_strength_min = models.FloatField(null=True, blank=True)
    clients_5ghz_signal_strength_max = models.FloatField(null=True, blank=True)
    clients_5ghz_signal_strength_avg = models.FloatField(null=True, blank=True)

    dish_id = models.TextField(null=True, blank=True)
    api_version = models.TextField(null=True, blank=True)

    active_alerts = ArrayField(models.IntegerField(), null=True, blank=True)

    utc_timestamp_ns = models.BigIntegerField()

    class Meta:
        db_table = "telemetry_r"
        indexes = [
            models.Index(fields=["device_id", "-ts"], name="telemetry_r_dev_ts_idx"),
        ]

        constraints = [
            models.CheckConstraint(
                condition=models.Q(device_type__in=["u", "r", "i"]),
                name="telemetry_r_device_type_allowed",
            )
        ]
    def __str__(self) -> str:
        return f"R {self.device_id} @ {self.ts.isoformat()}"


class TelemetryI(TimescaleModel):
    device_id = models.TextField(db_index=True)
    device_type = models.TextField(default="i")

    # Postgres inet
    ipv4 = models.GenericIPAddressField(null=True, blank=True, protocol="both", unpack_ipv4=True)
    ipv6_ue = models.GenericIPAddressField(null=True, blank=True, protocol="both", unpack_ipv4=True)
    ipv6_cpe = models.GenericIPAddressField(null=True, blank=True, protocol="both", unpack_ipv4=True)

    utc_timestamp_ns = models.BigIntegerField()

    class Meta:
        db_table = "telemetry_i"
        indexes = [
            models.Index(fields=["device_id", "-ts"], name="telemetry_i_dev_ts_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(device_type__in=["u", "r", "i"]),
                name="telemetry_i_device_type_allowed",
            )
        ]
    def __str__(self) -> str:
        return f"I {self.device_id} @ {self.ts.isoformat()}"
    


class StarlinkMetadata(models.Model):
    """
    Stores Starlink telemetry metadata (enums/mappings) as JSON.
    Metadata changes rarely; we update only when checksum changes.
    """
    key = models.TextField(primary_key=True)  # e.g. "telemetry_stream_metadata"
    payload = models.JSONField()
    checksum = models.CharField(max_length=64, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "starlink_metadata"


class StarlinkDeviceInfo(models.Model):
    """
    Stores static device information (e.g. hardware/software versions) for Starlink devices.
    Updated whenever device info changes, keyed by device_id.
    """
    device_id = models.TextField(primary_key=True)
    nickname = models.TextField(null=True, blank=True)
    subscription_id = models.TextField(null=True, blank=True)
    user_terminal_kit_id = models.TextField(null=True, blank=True)
    user_terminal_dish_id = models.TextField(null=True, blank=True)
    router_id = models.TextField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "starlink_device_info"