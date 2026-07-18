# Backup and Restore Procedures

## Overview

| Component | Method | Frequency | Retention | Location |
|-----------|--------|-----------|-----------|----------|
| MongoDB | `mongodump` (gzip) | Every 6 hours | 30 days | `/backups/mongodb/` + S3 |
| Redis | RDB snapshot | Every 6 hours | 30 days | `/backups/redis/` + S3 |
| Configs | tar.gz | Every 6 hours | 30 days | `/backups/` + S3 |
| MongoDB Atlas | Continuous backup (PITR) | Real-time | 30 days | Atlas-managed |
| R2 Storage | Versioning + cross-region replication | Automatic | 30 days | Cloudflare-managed |

---

## Creating Backups

### Manual Backup

```bash
make backup
```

Creates:
- `/backups/mongodb/dump_<timestamp>.gz` — Full MongoDB dump
- `/backups/redis/dump_<timestamp>.rdb` — Redis RDB snapshot
- `/backups/config_<timestamp>.tar.gz` — Docker configs + k8s manifests

### Automated Backup (Cron)

Install via:
```bash
crontab -e
# Add:
0 */6 * * * /opt/myworkspace/scripts/cron-backup.sh >> /var/log/myworkspace/backup-cron.log 2>&1
```

### Backup to S3-compatible Storage

Set env vars:
```bash
export S3_BACKUP_BUCKET=s3://myworkspace-backups
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

Or use rclone:
```bash
export S3_BACKUP_BUCKET=mybucket:/backups
```

---

## Restoring Backups

### Restore MongoDB

```bash
# Restore latest backup
make restore

# Restore specific backup
make restore FILE=/backups/mongodb/dump_20250101_000000.gz
```

The restore script will:
1. WARN you about data loss (requires `yes` confirmation)
2. Run `mongorestore --drop` (replaces all data)
3. Verify completion

### Restore Redis

```bash
# Stop Redis, replace RDB, restart
docker compose stop redis
cp /backups/redis/dump_20250101_000000.rdb /var/lib/redis/dump.rdb
docker compose start redis
```

### Point-in-Time Recovery (Atlas)

If using MongoDB Atlas with PITR:
1. Go to Atlas → Cluster → Restore
2. Select timestamp
3. Restore to new cluster or replace existing
4. Update `MONGODB_URI` to point to restored cluster

---

## Backup Verification

### Automated Verification

```bash
# Check backup size and integrity
ls -lh /backups/mongodb/latest.gz
gunzip -t /backups/mongodb/latest.gz && echo "Valid gzip"

# Test restore to isolated environment
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d mongodb
mongorestore --uri=mongodb://localhost:27018 --gzip --archive=/backups/mongodb/latest.gz
```

### Data Integrity Checks

```bash
# Connect to test MongoDB
docker compose exec mongodb mongosh

# Verify document counts
use myworkspace
db.getCollectionNames().forEach(c => {
  const count = db[c].countDocuments();
  print(`${c}: ${count}`);
});
```

---

## Retention Policy

| Backup Type | Retention | Action |
|-------------|-----------|--------|
| MongoDB dumps | 30 days | Auto-deleted via `find -mtime +30 -delete` |
| Redis RDB | 30 days | Auto-deleted via `find -mtime +30 -delete` |
| Config archives | 30 days | Auto-deleted via `find -mtime +30 -delete` |
| Atlas snapshots | 30 days | Atlas-managed |
| R2 object versions | 30 days | Bucket lifecycle rule |

---

## Recovery Time Objectives

| Component | RTO | RPO | Method |
|-----------|-----|-----|--------|
| Application | 5 min | Real-time | K8s self-heal / Docker restart |
| Database | 15 min | 6 hours | mongorestore |
| Cache | 5 min | 6 hours | Redis RDB reload |
| Object Storage | 1 hour | Real-time | R2 replication |
