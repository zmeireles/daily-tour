# v5.25.0 is the newest tag published on Docker Hub (osrm/osrm-backend jumped
# 5.25 → 6.0; v5.26/5.27/5.28 never existed). The old v5.28.0 pin 404'd — it
# only surfaced when publish-images.yml first built this image (osrm is otherwise
# an optional overlay that local dev rarely brings up).
FROM osrm/osrm-backend:v5.25.0

# wget + ca-certificates are not in the base image and are needed for the
# first-run PBF download over HTTPS (scripts/init.sh hits download.geofabrik.de).
# Without ca-certificates the https wget fails cert verification, `set -e` exits,
# and the container restart-loops re-downloading. The base is Debian stretch
# (EOL): its apt repos moved to archive.debian.org and the Release signature has
# expired, so a plain `apt-get update` 404s — point apt at the archive + bypass
# the expiry check.
RUN printf '%s\n' \
      'deb [trusted=yes] http://archive.debian.org/debian stretch main' \
      'deb [trusted=yes] http://archive.debian.org/debian-security stretch/updates main' \
      > /etc/apt/sources.list \
    && apt-get -o Acquire::Check-Valid-Until=false update \
    && apt-get install -y --no-install-recommends wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data

COPY scripts/init.sh /init.sh
RUN chmod +x /init.sh

EXPOSE 5000

ENTRYPOINT ["/init.sh"]
