# Security Measures

## Overview
This document outlines the security measures implemented to protect the Rebelz application from common web attacks and malicious requests.

## Implemented Security Features

### 1. Protection Against .env File Access ✅

**Threat**: Attackers attempt to access `.env` files to steal sensitive credentials like database passwords, API keys, etc.

**Implementation**:
- **Block all hidden files**: Any request to files starting with `.` (dot) is denied
- **Honeypot for .env**: Returns fake credentials and logs the attacker's IP
- **Response**: Returns HTTP 444 (connection closed) or fake data

**Reference**: Based on [Stack Overflow solution](https://stackoverflow.com/a/64109923)

```nginx
# Block all hidden files
location ~ /\. {
    access_log /var/log/nginx/security.log security;
    deny all;
    return 444;
}

# Honeypot for .env - returns fake data
location = /.env {
    access_log /var/log/nginx/security.log security;
    default_type text/plain;
    return 200 "# Fake .env file - Your IP has been logged\n...";
}
```

### 2. Rate Limiting ✅

**Purpose**: Prevent brute force attacks and DDoS attempts

**Implementation**:
- **General requests**: 10 requests/second per IP (burst: 20)
- **API endpoints**: 5 requests/second per IP (burst: 10)
- **Auth endpoints**: 3 requests/second per IP (burst: 5)
- **Connection limit**: Max 10 concurrent connections per IP

```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;
```

### 3. SQL Injection Protection ✅

**Blocks**:
- `union.*select`
- `insert.*into`
- `delete.*from`
- `drop.*table`

```nginx
if ($query_string ~* "union.*select|insert.*into|delete.*from|drop.*table") {
    access_log /var/log/nginx/security.log security;
    return 444;
}
```

### 4. XSS (Cross-Site Scripting) Protection ✅

**Blocks**:
- `<script` tags
- `javascript:` protocol
- `onerror=` attributes
- `onload=` attributes

```nginx
if ($query_string ~* "<script|javascript:|onerror=|onload=") {
    access_log /var/log/nginx/security.log security;
    return 444;
}
```

### 5. Directory Traversal Protection ✅

**Blocks**: Path traversal attempts like `../` or `..\`

```nginx
if ($query_string ~* "\.\./|\.\.\\") {
    access_log /var/log/nginx/security.log security;
    return 444;
}
```

### 6. Block Common Exploit Attempts ✅

**Blocked file types**:
- `.php`, `.asp`, `.aspx`, `.jsp`, `.cgi` - Server-side scripts
- `.bak`, `.backup`, `.old`, `.orig`, `.save`, `.swp`, `~` - Backup files
- `config.php`, `configuration.xml`, etc. - Configuration files

**Blocked paths**:
- `/admin`, `/phpmyadmin`, `/pma`, `/mysql`
- `/wp-admin`, `/wp-login` (WordPress)
- `/administrator` (Joomla)

### 7. Enhanced Security Headers ✅

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Protection against**:
- **Clickjacking**: X-Frame-Options
- **XSS**: X-XSS-Protection
- **MIME sniffing**: X-Content-Type-Options
- **Referrer leakage**: Referrer-Policy
- **Unwanted permissions**: Permissions-Policy

### 8. Security Logging ✅

All suspicious requests are logged to a separate file with detailed information:

```nginx
log_format security '$remote_addr - $remote_user [$time_local] '
                   '"$request" $status $body_bytes_sent '
                   '"$http_referer" "$http_user_agent" '
                   'SUSPICIOUS';
```

**Log location**: `/var/log/nginx/security.log`

## Attack Patterns Detected

### Recent Attack (Oct 20, 2025)
```
Oct 20 18:05:52 SUSPICIOUS REQUEST: GET http://rebelz.app/.env from 38.242.220.219
```

**Response**: Now blocked and logged. Attacker receives fake credentials.

### Common Attack Patterns
1. **`.env` file access** - Credential theft
2. **SQL injection** - Database compromise
3. **XSS attacks** - Session hijacking
4. **Directory traversal** - Unauthorized file access
5. **Admin panel probing** - Brute force attempts
6. **Backup file access** - Source code theft

## Monitoring & Response

### How to Monitor Security Logs

```bash
# View recent suspicious requests
docker exec app tail -f /var/log/nginx/security.log

# Count attacks by IP
docker exec app awk '{print $1}' /var/log/nginx/security.log | sort | uniq -c | sort -rn

# View .env access attempts
docker exec app grep "\.env" /var/log/nginx/security.log
```

### Automated Alerts (Recommended)

Consider implementing:
1. **Log monitoring service** (e.g., Datadog, Splunk, ELK Stack)
2. **Email alerts** for repeated attacks from same IP
3. **IP blocking** after threshold of suspicious requests
4. **Fail2ban** for automatic IP banning

### Manual IP Blocking

If an IP is repeatedly attacking:

```nginx
# Add to nginx.conf
location / {
    deny 38.242.220.219;  # Block specific IP
    # ... rest of config
}
```

## Best Practices

### ✅ Implemented
- [x] Block access to sensitive files
- [x] Rate limiting on all endpoints
- [x] Security headers
- [x] Input validation (SQL injection, XSS)
- [x] Separate security logging
- [x] Honeypot for attackers

### 🔄 Recommended Additional Measures
- [ ] Implement fail2ban for automatic IP banning
- [ ] Set up log monitoring and alerting
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Web Application Firewall (WAF) like Cloudflare
- [ ] DDoS protection service
- [ ] SSL/TLS certificate (HTTPS)
- [ ] HSTS (HTTP Strict Transport Security)
- [ ] Content Security Policy (CSP)

## Testing Security

### Test Rate Limiting
```bash
# Should get 429 after burst limit
for i in {1..30}; do curl http://rebelz.app/auth/token; done
```

### Test .env Blocking
```bash
# Should return fake data or 444
curl http://rebelz.app/.env
```

### Test SQL Injection Blocking
```bash
# Should be blocked
curl "http://rebelz.app/?id=1%20union%20select%20*%20from%20users"
```

## Incident Response

### If You Detect an Attack:

1. **Identify the attack pattern** from logs
2. **Block the IP** if repeated attempts
3. **Review what was accessed** (if anything)
4. **Check for data breaches**
5. **Update security measures** if needed
6. **Document the incident**

### Emergency Contacts
- Security Team: [Add contact]
- System Administrator: [Add contact]
- Hosting Provider: [Add contact]

## Compliance

This security configuration helps meet requirements for:
- **OWASP Top 10** protection
- **PCI DSS** (if handling payments)
- **GDPR** (data protection)
- **SOC 2** (security controls)

## Updates

- **2025-10-21**: Initial security implementation
  - Added .env protection
  - Implemented rate limiting
  - Added security headers
  - Configured security logging
  - Created honeypot for attackers

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nginx Security Best Practices](https://www.nginx.com/blog/mitigating-ddos-attacks-with-nginx-and-nginx-plus/)
- [Stack Overflow: .env Security](https://stackoverflow.com/a/64109923)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)

---

**Last Updated**: October 21, 2025  
**Maintained By**: Development Team

