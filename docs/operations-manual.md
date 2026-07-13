# Operations Manual

## Daily Operations

### Morning Health Check
```bash
# Check pod status
kubectl get pods -n myworkspace

# Check for restarts
kubectl get pods -n myworkspace -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}'

# Check resource usage
kubectl top pods -n myworkspace

# Check ingress
kubectl get ingress -n myworkspace

# Verify health endpoints
curl -s https://myworkspace.myenum.in/api/health | jq .
```

### Log Monitoring
```bash
# Backend logs
kubectl logs -n myworkspace -l app=myworkspace-backend --tail=100

# Error logs
kubectl logs -n myworkspace -l app=myworkspace-backend --tail=100 | grep -i error

# Slow requests
kubectl logs -n myworkspace -l app=myworkspace-backend --tail=1000 | grep "duration" | awk -F'"duration":' '{print $2}' | awk -F',' '{if($1>1000) print $0}'
```

## Incident Response

### Service Down
1. Check pod status: `kubectl get pods -n myworkspace`
2. Check logs: `kubectl logs -n myworkspace -l app=myworkspace-backend --tail=50`
3. Restart if needed: `kubectl rollout restart deployment/myworkspace-backend -n myworkspace`
4. Check MongoDB Atlas status
5. Check Redis status
6. Verify ingress is healthy

### High Latency
1. Check Grafana dashboard for latency spikes
2. Check database slow queries in MongoDB Atlas
3. Check Redis hit ratio
4. Check for resource limits being hit
5. Scale up if needed: `kubectl scale deployment/myworkspace-backend --replicas=5 -n myworkspace`

### Memory Leak
1. Check heap usage in Grafana
2. Take heap dump: `kubectl exec -n myworkspace deployment/myworkspace-backend -- node -e "process.kill(process.pid, 'SIGUSR2')"`
3. Analyze heap dump
4. Restart pods if critical

## Deployment

### Standard Deployment
```bash
# Update image tag
kubectl set image deployment/myworkspace-backend \
  backend=ghcr.io/myworkspace/backend:$TAG \
  -n myworkspace

# Wait for rollout
kubectl rollout status deployment/myworkspace-backend -n myworkspace

# Verify
curl -s https://myworkspace.myenum.in/api/health | jq .
```

### Rollback
```bash
# Rollback to previous version
kubectl rollout undo deployment/myworkspace-backend -n myworkspace

# Rollback to specific revision
kubectl rollout undo deployment/myworkspace-backend --to-revision=5 -n myworkspace
```

### Blue-Green Deployment
```bash
# Deploy green version
kubectl apply -f k8s/overlays/production/backend-green.yaml

# Verify green is healthy
kubectl exec -n myworkspace deployment/myworkspace-backend-green -- wget -qO- http://localhost:4000/api/health

# Switch traffic
kubectl patch ingress myworkspace-ingress -n myworkspace -p '{"spec":{"rules":[{"host":"myworkspace.myenum.in","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"myworkspace-backend-green","port":{"number":4000}}}}]}}]}}'

# Remove blue
kubectl delete deployment myworkspace-backend-blue -n myworkspace
```

## Database Operations

### MongoDB Maintenance
```bash
# Check replica set status
mongosh --eval "rs.status()" mongodb://localhost:27017

# Check index usage
mongosh --eval "db.tasks.aggregate([{$indexStats: {}}])" mongodb://localhost:27017

# Compact collection (use sparingly)
mongosh --eval "db.runCommand({compact: 'tasks'})" mongodb://localhost:27017
```

### Redis Maintenance
```bash
# Check memory usage
redis-cli info memory

# Clear cache (emergency only)
redis-cli FLUSHALL

# Check slow log
redis-cli slowlog get 10
```

## Monitoring

### Grafana Dashboards
- Production: https://grafana.myworkspace.myenum.in/d/myworkspace
- Alerts: https://grafana.myworkspace.myenum.in/alerting

### Prometheus
- Metrics: http://prometheus.myworkspace.myenum.in:9090
- Targets: http://prometheus.myworkspace.myenum.in:9090/targets

### Sentry
- Errors: https://sentry.io/organizations/myworkspace/issues/

## Scaling

### Manual Scaling
```bash
# Scale backend
kubectl scale deployment/myworkspace-backend --replicas=5 -n myworkspace

# Scale frontend
kubectl scale deployment/myworkspace-frontend --replicas=4 -n myworkspace
```

### Auto-scaling
HPA is configured for both backend and frontend:
- Backend: 3-10 pods (CPU > 70% or Memory > 80%)
- Frontend: 3-8 pods (CPU > 70%)

## Backup & Restore

### MongoDB Backup
- Automated via MongoDB Atlas
- Point-in-time recovery available
- Cross-region backup replication

### Restore Procedure
```bash
# From Atlas backup
mongorestore --uri="<new-uri>" --archive=<backup-file>

# Verify restore
mongosh --eval "db.tasks.count()" <new-uri>
```

## Communication

### Status Page
- URL: https://status.myworkspace.myenum.in
- Updates during incidents

### Notification Channels
- PagerDuty: Critical alerts
- Slack: All alerts
- Email: Daily summary
