# Daily Tour — Postgres 17 + pgvector image.
#
# Extends the upstream pgvector image with the pt_PT.UTF-8 locale so collation
# for Portuguese place names sorts correctly (e.g. "Águas Livres" vs "Aguas").
# If you hit locale issues (e.g. on Alpine variants), fall back to en_US.UTF-8
# by changing LC_COLLATE in `.env` — the image generates both.

FROM pgvector/pgvector:pg17

RUN apt-get update \
 && apt-get install -y --no-install-recommends locales \
 && sed -i '/pt_PT.UTF-8/s/^# //' /etc/locale.gen \
 && sed -i '/en_US.UTF-8/s/^# //' /etc/locale.gen \
 && locale-gen \
 && rm -rf /var/lib/apt/lists/*
