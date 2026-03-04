# Starlink Monitor

A telemetry ingestion and visualization stack for monitoring **Starlink
User Terminals (UT)** and routers.

The system collects telemetry from the Starlink API, stores it in
**TimescaleDB**, and visualizes metrics using a **React + uPlot**
frontend.

-------------------------------------------------------------------------

### Requirements
- Python 3.14
- Node.js 22 

## Setup
Clone project:

```bash
git clone https://github.com/bsdemon/starlink-monitor.git

cd starlink-monitor
```

Copy or rename `.env_example` to `.evn`

Add credentials for:
```bash
STARLINK_CLIENT_ID=<client_id>
STARLINK_CLIENT_SECRET=<client_secret>
``` 

Run docker composition
```bash
docker compose up --build
```

## Portal

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api


------------------------------------------------------------------------

## Architecture

    Starlink API
          │
          ▼
    Telemetry Collector (Python)
          │
          ▼
    TimescaleDB (PostgreSQL + hypertables)
          │
          ▼
    Django + Django Ninja API
          │
          ▼
    React (Vite) Frontend
          │
          ▼
    uPlot Charts + Leaflet Map

------------------------------------------------------------------------

## Features

-   Collects Starlink telemetry periodically
-   Stores high‑frequency time series in **TimescaleDB**
-   REST API built with **Django Ninja**
-   Interactive charts using **uPlot**
-   Device map using **Leaflet**
-   Multiple time bucket resolutions

Supported buckets:

-   `15s`
-   `1m`
-   `5m`
-   `15m`
-   `1h`
-   `1d`

------------------------------------------------------------------------

## Telemetry Data
All telemetry data and error code from
[https://starlink.readme.io/docs/telemetry-api]
is stored in time series DB

## Deveice data
Basic device data is stored
- nickname
- subscription_id
- user terminal KIT id
- user terminal dish id

------------------------------------------------------------------------

## API Endpoints

### Devices

    GET /api/ut/devices

Returns all discovered devices.

------------------------------------------------------------------------

### Daily Summary

    GET /api/ut/devices/{device_id}/summary?day=YYYY-MM-DD

Aggregated metrics for a specific day.

------------------------------------------------------------------------

### Timeseries

    GET /api/ut/devices/{device_id}/timeseries?from=&to=&bucket=&metrics=

Parameters:
  |parameter|description
  |-----------|-----------------------------|
  |from|   start ISO timestamp|
  |to|     end ISO timestamp|
  |bucket| aggregation bucket|
  |metrics|comma separated metric list|

Example:

    /api/ut/devices/{device_id}/timeseries?from=2026-03-01T00:00:00Z&to=2026-03-02T00:00:00Z&bucket=1m&metrics=downlinkMbps,uplinkMbps

------------------------------------------------------------------------

### OPEN API
    
[OPEN API docs](http://localhost:8000/api/docs)

---------------------------------------------------------------------------


## Development

### Backend

Requirements:

-   Python 3.14
-   PostgreSQL / TimescaleDB

Install requirenets:

    uv sync

Run:

    uv run python manage.py runserver

------------------------------------------------------------------------

### Frontend

    cd frontend
    npm install
    npm run dev

------------------------------------------------------------------------

### Docker compose

    docker compose up --build 
