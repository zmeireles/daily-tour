FROM osrm/osrm-backend:v5.28.0

# wget is not present in the base image and is needed for the first-run PBF download.
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data

COPY scripts/init.sh /init.sh
RUN chmod +x /init.sh

EXPOSE 5000

ENTRYPOINT ["/init.sh"]
