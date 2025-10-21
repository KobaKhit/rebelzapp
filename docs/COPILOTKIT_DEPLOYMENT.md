# CopilotKit Deployment Guide

## Current Status

🟡 **Partially Implemented** - Backend SSE endpoint created but not yet deployed to production.

The AI Assistant currently works with the standard chat interface (`useAGUI: false`). To enable advanced AG-UI and CopilotKit features, follow this deployment guide.

## What's Implemented

### Backend (`app/api/routers/copilotkit.py`)
✅ SSE endpoint at `GET /api/copilotkit`  
✅ Chat endpoint at `POST /api/copilotkit`  
✅ Token authentication support (query param + header)  
✅ Heartbeat mechanism  
✅ Action handlers (create event, search, register)  

### Frontend
✅ `EnhancedAGUIChat` component with SSE support  
✅ CopilotKit provider configuration  
✅ Toggle switches for AG-UI and CopilotKit  
⚠️ Currently disabled by default (waiting for backend deployment)  

## Deployment Steps

### Step 1: Verify Backend Changes

Ensure the following files are committed and ready for deployment:

```bash
# Check if copilotkit router has SSE endpoint
git diff app/api/routers/copilotkit.py

# Verify main.py includes the router
grep "copilotkit" app/main.py
```

Expected output in `main.py`:
```python
from app.api.routers import copilotkit as copilotkit_router
app.include_router(copilotkit_router.router, prefix="/api", tags=["copilotkit"])
```

### Step 2: Deploy Backend

#### Option A: Docker Deployment
```bash
# Build and deploy
docker-compose up -d --build

# Check logs
docker-compose logs -f backend
```

#### Option B: DigitalOcean App Platform
```bash
# Push changes to main branch
git add .
git commit -m "Add CopilotKit SSE endpoint"
git push origin main

# DigitalOcean will auto-deploy
# Monitor deployment in DigitalOcean dashboard
```

### Step 3: Test SSE Endpoint

After deployment, test the endpoint:

```bash
# Test without auth
curl -N -H "Accept: text/event-stream" https://rebelz.app/api/copilotkit

# Expected output:
# data: {"type":"connection","data":{"status":"connected","authenticated":false}}
# 
# data: {"type":"heartbeat","data":{"timestamp":"now","authenticated":false}}
```

```bash
# Test with auth (replace YOUR_TOKEN)
curl -N -H "Accept: text/event-stream" \
  "https://rebelz.app/api/copilotkit?token=YOUR_TOKEN"

# Expected output:
# data: {"type":"connection","data":{"status":"connected","authenticated":true,"user":"user@example.com"}}
```

### Step 4: Enable Frontend Features

Once the backend is deployed and tested, enable AG-UI in the frontend:

**File: `frontend/src/pages/AIChat.tsx`**

```typescript
// Change from:
const [useAGUI, setUseAGUI] = useState(false);
const [useCopilotKit, setUseCopilotKit] = useState(false);

// To:
const [useAGUI, setUseAGUI] = useState(true);
const [useCopilotKit, setUseCopilotKit] = useState(true);
```

### Step 5: Build and Deploy Frontend

```bash
cd frontend
npm run build
cd ..

# Deploy (method depends on your setup)
# For Docker:
docker-compose up -d --build

# For DigitalOcean:
git add frontend/src/pages/AIChat.tsx
git commit -m "Enable CopilotKit features"
git push origin main
```

### Step 6: Verify in Browser

1. Open https://rebelz.app/ai-chat
2. Open browser console (F12)
3. Look for: `AG-UI connection established` ✅
4. Should NOT see: EventSource errors ❌
5. Test chat functionality

## Troubleshooting

### Issue: 404 on `/api/copilotkit`

**Symptoms:**
```
GET https://rebelz.app/api/copilotkit 404 (Not Found)
POST https://rebelz.app/api/copilotkit 404 (Not Found)
```

**Solutions:**

1. **Verify backend deployment:**
   ```bash
   curl https://rebelz.app/health
   # Should return: {"status":"ok"}
   ```

2. **Check if router is included:**
   ```bash
   # SSH into server or check logs
   grep "copilotkit" app/main.py
   ```

3. **Restart backend:**
   ```bash
   docker-compose restart backend
   # or
   systemctl restart your-app-service
   ```

4. **Check nginx configuration:**
   ```nginx
   # Ensure /api/* is proxied to backend
   location /api/ {
       proxy_pass http://backend:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

### Issue: EventSource MIME Type Error

**Symptoms:**
```
EventSource's response has a MIME type ("text/html") that is not "text/event-stream"
```

**Solutions:**

1. **Check endpoint returns correct MIME type:**
   ```bash
   curl -I https://rebelz.app/api/copilotkit
   # Should include: Content-Type: text/event-stream
   ```

2. **Verify nginx doesn't modify response:**
   ```nginx
   location /api/copilotkit {
       proxy_pass http://backend:8000;
       proxy_buffering off;
       proxy_cache off;
       proxy_set_header Connection '';
       proxy_http_version 1.1;
       chunked_transfer_encoding off;
   }
   ```

### Issue: Connection Drops Frequently

**Solutions:**

1. **Increase heartbeat interval** (if network is unstable):
   ```python
   # In app/api/routers/copilotkit.py
   await asyncio.sleep(60)  # Change from 30 to 60 seconds
   ```

2. **Check firewall/proxy timeouts:**
   - Ensure timeout > heartbeat interval
   - Configure nginx: `proxy_read_timeout 90s;`

3. **Add connection retry logic** (already implemented in frontend)

### Issue: Authentication Fails

**Symptoms:**
```
data: {"type":"connection","data":{"status":"connected","authenticated":false}}
```
Even when token is provided.

**Solutions:**

1. **Verify token is being sent:**
   ```javascript
   // Check browser console
   console.log(localStorage.getItem('token'));
   ```

2. **Check token format:**
   ```bash
   # Token should be JWT format
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Verify token isn't expired:**
   ```python
   # In backend, check token expiry
   from app.services.security import decode_access_token
   payload = decode_access_token(token)
   print(payload.get("exp"))  # Should be future timestamp
   ```

## Alternative: Disable SSE (Fallback Mode)

If SSE isn't working, the AI Assistant will still function with regular HTTP requests:

**File: `frontend/src/pages/AIChat.tsx`**
```typescript
const [useAGUI, setUseAGUI] = useState(false);  // Use standard chat
const [useCopilotKit, setUseCopilotKit] = useState(false);  // Disable CopilotKit
```

This uses the `/ai/chat` endpoint with POST requests instead of SSE.

## Production Checklist

Before enabling in production:

- [ ] Backend deployed with SSE endpoint
- [ ] SSE endpoint tested and working
- [ ] Authentication working correctly
- [ ] Nginx configured for SSE (no buffering)
- [ ] Firewall allows long-lived connections
- [ ] Frontend built and deployed
- [ ] Browser console shows no errors
- [ ] Chat functionality tested end-to-end
- [ ] Load tested (multiple concurrent connections)

## Performance Considerations

### SSE Connections
- Each user creates one persistent connection
- Monitor server resources (connections, memory)
- Consider connection limits per user
- Implement connection pooling if needed

### Scaling
- SSE connections are stateful
- Use sticky sessions if load balancing
- Consider Redis for shared state
- Monitor connection count and server load

## Future Enhancements

- [ ] Streaming AI responses (token-by-token)
- [ ] Real-time collaboration features
- [ ] Push notifications via SSE
- [ ] Live event updates
- [ ] Connection pooling and optimization
- [ ] Rate limiting for SSE connections
- [ ] Metrics and monitoring dashboard

## Related Documentation

- [CopilotKit SSE Fix](COPILOTKIT_SSE_FIX.md) - Technical implementation details
- [CopilotKit Integration](COPILOTKIT_INTEGRATION.md) - Original integration guide
- [Deployment Guide](DEPLOYMENT.md) - General deployment instructions
- [Security Guide](SECURITY.md) - Security considerations

## Support

If you encounter issues not covered here:

1. Check server logs: `docker-compose logs -f backend`
2. Check browser console for errors
3. Test SSE endpoint directly with curl
4. Review nginx logs: `tail -f /var/log/nginx/error.log`
5. Check DigitalOcean deployment logs

---

**Last Updated:** October 2025  
**Status:** Ready for deployment

