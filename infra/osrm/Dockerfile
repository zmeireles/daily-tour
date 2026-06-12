# v5.25.0 is the newest tag published on Docker Hub (osrm/osrm-backend jumped
# 5.25 → 6.0; v5.26/5.27/5.28 never existed). The old v5.28.0 pin 404'd — it
# only surfaced when publish-images.yml first built this image (osrm is otherwise
# an optional overlay that local dev rarely brings up).
FROM osrm/osrm-backend:v5.25.0

# wget is not present in the base image and is needed for the first-run PBF download.
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data

COPY scripts/init.sh /init.sh
RUN chmod +x /init.sh

EXPOSE 5000

ENTRYPOINT ["/init.sh"]
