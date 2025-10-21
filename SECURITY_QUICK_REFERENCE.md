# Security Quick Reference

## 🚨 Attack Detected? Here's What to Do

### 1. Check Security Logs
```bash
# View recent attacks
docker exec app tail -50 /var/log/nginx/security.log

# Count attacks by IP
docker exec app awk '{print $1}' /var/log/nginx/security.log | sort | uniq -c | sort -rn | head -20

# Find specific attack type
docker exec app grep "\.env" /var/log/nginx/security.log
docker exec app grep "union.*select" /var/log/nginx/security.log
```

### 2. Block Malicious IP
Edit `frontend/nginx.conf` and add:
```nginx
# Add inside server block, before location blocks
deny 38.242.220.219;  # Replace with attacker IP
```

Then restart:
```bash
docker-compose restart app
```

### 3. Common Attack Patterns

| Attack Type | Pattern | Response |
|------------|---------|----------|
| `.env` access | `GET /.env` | Returns fake data, logs IP |
| SQL Injection | `union select`, `drop table` | HTTP 444 (closed) |
| XSS | `<script>`, `javascript:` | HTTP 444 (closed) |
| Directory Traversal | `../`, `..\` | HTTP 444 (closed) |
| Admin Probing | `/admin`, `/phpmyadmin` | HTTP 444 (closed) |
| Backup Files | `.bak`, `.backup` | HTTP 444 (closed) |

## 🛡️ Current Protection

### Rate Limits
- **General**: 10 req/s (burst: 20)
- **API**: 5 req/s (burst: 10)  
- **Auth**: 3 req/s (burst: 5)
- **Connections**: 10 per IP

### Blocked Files
- All hidden files (`.env`, `.git`, etc.)
- PHP/ASP/JSP scripts
- Backup files (`.bak`, `.old`, etc.)
- Config files (`config.php`, etc.)

### Blocked Paths
- `/admin`, `/phpmyadmin`, `/wp-admin`
- Any path with SQL injection
- Any path with XSS attempts

## 📊 Quick Stats

```bash
# Total suspicious requests today
docker exec app grep "$(date +%d/%b/%Y)" /var/log/nginx/security.log | wc -l

# Top 10 attacking IPs
docker exec app awk '{print $1}' /var/log/nginx/security.log | sort | uniq -c | sort -rn | head -10

# Attack types distribution
docker exec app grep -o '"GET [^"]*"' /var/log/nginx/security.log | sort | uniq -c | sort -rn | head -10
```

## 🔧 Testing Security

```bash
# Test .env blocking (should return fake data)
curl http://rebelz.app/.env

# Test rate limiting (should get 429 after burst)
for i in {1..30}; do curl -s -o /dev/null -w "%{http_code}\n" http://rebelz.app/; done

# Test SQL injection blocking (should get no response)
curl "http://rebelz.app/?id=1%20union%20select"
```

## 📞 Emergency Contacts

- **Security Issue**: [Add contact]
- **DevOps Team**: [Add contact]
- **Hosting Support**: [Add contact]

## 🔗 Full Documentation

See [SECURITY.md](./SECURITY.md) for complete details.

