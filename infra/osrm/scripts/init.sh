#!/bin/sh
set -e

DATA_DIR=/data
PBF_URL="https://download.geofabrik.de/europe/portugal/acores-latest.osm.pbf"
PBF_FILE="${DATA_DIR}/acores-latest.osm.pbf"
OSRM_FILE="${DATA_DIR}/acores-latest.osrm"
PROFILE=/opt/car.lua

if [ ! -f "${OSRM_FILE}" ]; then
    echo "[osrm-init] Downloading Azores PBF from Geofabrik (~15 MB)..."
    wget -q -O "${PBF_FILE}" "${PBF_URL}"

    echo "[osrm-init] Running osrm-extract (car profile)..."
    osrm-extract -p "${PROFILE}" "${PBF_FILE}"

    echo "[osrm-init] Running osrm-contract..."
    osrm-contract "${OSRM_FILE}"

    rm -f "${PBF_FILE}"
    echo "[osrm-init] Data ready."
else
    echo "[osrm-init] Processed data found at ${OSRM_FILE}, skipping init."
fi

exec osrm-routed --algorithm ch "${OSRM_FILE}" --port 5000 --host 0.0.0.0
