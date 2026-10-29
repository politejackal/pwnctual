# Image every submission runs in. Built on the VM (arm64):
#   docker build -t pwnctual-sandbox runner/sandbox
FROM debian:trixie-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libc6-dev python3 \
    && rm -rf /var/lib/apt/lists/*

# Containers run as nobody (65534) with a read-only root. /work holds the
# submission, /tmp is a small tmpfs.
WORKDIR /work
USER 65534:65534
