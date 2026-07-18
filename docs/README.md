# MyWorkSpace — Production Operations

## Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Production deployment guide (Docker + K8s) | DevOps |
| [`RUNBOOK.md`](./RUNBOOK.md) | Operations runbook — service management, logs, monitoring | Ops |
| [`INCIDENT-RESPONSE.md`](./INCIDENT-RESPONSE.md) | Incident response procedures for SEV1–SEV4 | On-call |
| [`SCALING.md`](./SCALING.md) | Scaling strategy, capacity planning, cost projections | Architecture |
| [`MAINTENANCE.md`](./MAINTENANCE.md) | Scheduled maintenance checklists, upgrade procedures | Ops |
| [`BACKUP-RESTORE.md`](./BACKUP-RESTORE.md) | Backup/restore procedures, retention policy, RTO/RPO | Ops |
| [`POST-DEPLOYMENT-VERIFICATION.md`](./POST-DEPLOYMENT-VERIFICATION.md) | Post-deployment verification checklist | QA/DevOps |
| [`operations-manual.md`](./operations-manual.md) | Legacy operations manual (daily ops) | Ops |
| [`disaster-recovery.md`](./disaster-recovery.md) | Disaster recovery plan (RTO/RPO, failover) | Architecture |

## Quick Reference

```bash
# Deploy
make deploy                 # Zero-downtime deploy
make deploy TAG=v1.2.3      # Specific version

# Rollback
make rollback               # Rollback to previous version

# Monitor
make health                 # Check health
make status                 # Service status
make logs-backend           # Tail backend logs

# Backup
make backup                 # Full backup
make restore                # Restore latest backup

# Maintenance
make rotate-logs            # Rotate logs
make migrate                # Run DB migrations

# Verify
make verify                 # Full deployment verification
```

## Makefile Targets

Run `make help` for the full list of targets.
