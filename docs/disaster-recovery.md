# Disaster Recovery Guide

## Recovery Time Objective (RTO)

| Component | RTO | Strategy |
|-----------|-----|----------|
| Application | 5 minutes | Kubernetes self-healing, auto-restart |
| Database | 15 minutes | MongoDB Atlas point-in-time recovery |
| Cache | 5 minutes | Redis restart, cache rebuild |
| Storage | 1 hour | R2 cross-region replication |

## Recovery Point Objective (RPO)

| Component | RPO | Backup Frequency |
|-----------|-----|------------------|
| Database | 5 minutes | Continuous (Atlas) |
| Cache | 0 (ephemeral) | N/A |
| Storage | 0 (R2 replication) | Real-time |
| Config | 0 (Git) | On every change |

## Backup Procedures

### MongoDB Atlas
- Automated continuous backups enabled
- Point-in-time recovery up to 30 days
- Cross-region backup replication
- Monthly restore testing

### Redis
- RDB snapshots every 5 minutes
- AOF (Append-Only File) for durability
- Cross-AZ replication

### Object Storage (R2)
- Versioning enabled
- Cross-region replication to secondary region
- Lifecycle policies for old versions

## Recovery Procedures

### 1. Application Failure
```bash
# Kubernetes auto-heals via liveness probes
kubectl get pods -n myworkspace
kubectl rollout restart deployment/myworkspace-backend -n myworkspace
```

### 2. Database Failure
```bash
# MongoDB Atlas automatic failover
# Manual failover via Atlas UI if needed
# Restore from point-in-time:
mongorestore --uri="<new-uri>" --oplogReplay --oplogLimit="<timestamp>"
```

### 3. Complete Region Failure
```bash
# 1. Switch DNS to secondary region
# 2. Restore database from cross-region backup
# 3. Deploy application in secondary region
# 4. Verify all services operational
# 5. Update DNS records
```

## Validation

### Monthly DR Test
1. Restore database to staging environment
2. Verify data integrity
3. Run application against restored database
4. Measure recovery time
5. Document any issues

### Quarterly DR Drill
1. Simulate complete region failure
2. Execute full failover procedure
3. Validate all services in secondary region
4. Measure RTO/RPO achieved
5. Update runbook with learnings

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-call Engineer | PagerDuty | Immediate |
| Database Admin | MongoDB Atlas Support | 15 minutes |
| Infrastructure | CloudOps Team | 30 minutes |
| Management | CTO | 1 hour |
