#!/usr/bin/env bash
# Tighten MicroOS snapper retention and reclaim btrfs allocation headroom.
# Run as root on each k3s node. Idempotent — safe to re-run.
#
# Why: kube-hetzner/MicroOS ships NUMBER_LIMIT=50 plus generous timeline
# limits, so daily OS-update snapshots pile up. When kured cannot drain a node
# (the 2026-05 outage), they are never reaped and fill the 40 GB root disk.
# We cap retention low and reclaim empty/sparse data chunks back to
# *unallocated* so btrfs can always grow its metadata block group — this is
# what prevents the metadata-ENOSPC deadlock that locked nsd's snapshots.
#
# MicroOS mounts the running root subvolume read-only, so the btrfs write
# ioctls (balance, quota rescan) must target a writable mount on the SAME
# filesystem: /var is a separate rw subvolume on /dev/sda2. Balancing the
# read-only '/' mount fails with EROFS (the bug seen in the recovery runbook).
#
# See issue #131 (stopgap) and docs/superpowers/plans/2026-05-28-cluster-architecture.md (Task C.3).
set -euo pipefail

echo "== before =="
echo -n "snapshots: "; snapper -c root list | grep -c '^[0-9]' || true
df -h / | tail -1

snapper -c root set-config \
  NUMBER_LIMIT=15 NUMBER_LIMIT_IMPORTANT=5 \
  TIMELINE_LIMIT_HOURLY=4 TIMELINE_LIMIT_DAILY=7 \
  TIMELINE_LIMIT_WEEKLY=2 TIMELINE_LIMIT_MONTHLY=1 \
  TIMELINE_LIMIT_QUARTERLY=0 TIMELINE_LIMIT_YEARLY=0

snapper -c root cleanup number
snapper -c root cleanup timeline

# Reclaim empty/sparse data chunks back to unallocated. Non-fatal: a node with
# ample unallocated headroom needs no balancing. Target the writable /var mount.
echo "== btrfs balance via /var (non-fatal) =="
btrfs balance start -dusage=20 /var 2>&1 | tail -2 || echo "balance skipped/failed — non-fatal"

# Repair qgroup accounting drift (snapper uses it for cleanup decisions).
btrfs quota rescan -w /var 2>&1 | tail -1 || echo "quota rescan skipped — non-fatal"

echo "== after =="
echo -n "snapshots: "; snapper -c root list | grep -c '^[0-9]' || true
df -h / | tail -1
btrfs fi usage /var 2>/dev/null | grep -iE 'Device unallocated|Metadata,' || true
