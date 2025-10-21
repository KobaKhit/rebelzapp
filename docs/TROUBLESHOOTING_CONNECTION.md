# Troubleshooting AG-UI and CopilotKit Connection Issues

## Symptoms

- AG-UI toggle shows "Disconnected"
- CopilotKit toggle shows "Disconnected"
- No errors in console (or SSE errors)

## Diagnostic Steps

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for:

```javascript
// Should see these logs:
AG-UI SSE connection opened
AG-UI connection confirmed: {status: "connected", ...}

// If you see errors:
AG-UI SSE connection error: Event {...}
EventSource readyState: 2  // 2 = CLOSED
EventSource URL: /ai/events?token=...
```

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "EventStream" or "ai/events"
3. Look for the SSE connection

**Expected:**
- Status: 200 OK
- Type: eventsource
- Size: (pending) - stays open
- Time: (pending) - stays open

**If you see:**
- Status: 404 - Backend endpoint not found
- Status: 502/503 - Backend not running
- Status: 0 (failed) - CORS or network issue

### Step 3: Test Backend Directly

#### Test AG-UI SSE Endpoint

```bash
# Without auth
curl -N https://rebelz.app/ai/events

# With auth token
curl -N "https://rebelz.app/ai/events?token=YOUR_TOKEN"

# Expected response:
data: {"type":"connection","data":{"status":"connected",...}}

# Should keep connection open and send heartbeats every 30s
```

#### Test CopilotKit Endpoint

```bash
# Get actions
curl https://rebelz.app/api/copilotkit

# Should return:
{"actions": [...]}
```

## Common Issues and Fixes

### Issue 1: 404 on /ai/events

**Cause:** Nginx not routing to backend

**Fix:** Check nginx.prod.conf has:
```nginx
location /ai/ {
    proxy_pass http://127.0.0.1:8000/ai/;
    # ... SSE config
}
```

**Verify:**
```bash
# SSH into server
docker exec -it <container> nginx -t
docker exec -it <container> cat /etc/nginx/nginx.conf | grep -A 10 "location /ai/"
```

### Issue 2: CORS Error

**Cause:** Frontend domain not in ALLOWED_ORIGINS

**Fix:** Add to environment variables:
```bash
ALLOWED_ORIGINS=https://rebelz.app,http://localhost:5173
```

### Issue 3: Backend Not Running

**Cause:** FastAPI crashed or not started

**Check:**
```bash
# Check if backend is responding
curl http://localhost:8000/health

# Check logs
docker logs <container>
```

### Issue 4: EventSource Immediately Closes

**Cause:** Backend sending wrong Content-Type or closing connection

**Fix:** Ensure backend sends:
```python
return StreamingResponse(
    event_stream(),
    media_type="text/event-stream",  # Critical!
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    }
)
```

### Issue 5: Connection Shows Disconnected Initially

**Cause:** Frontend sets connected only after receiving first event

**Expected Behavior:**
1. Component mounts
2. EventSource opens (shows "Disconnected")
3. Backend sends connection event
4. Frontend receives event and sets "Connected"

**This is normal!** It takes 1-2 seconds.

## Frontend Fixes Applied

### Fix 1: Set Connected on First Event

```typescript
// Before: Set on onopen (doesn't always fire)
eventSource.onopen = () => {
  setIsConnected(true);
};

// After: Set when receiving connection event
case 'connection':
  setIsConnected(true);
  break;
```

### Fix 2: Fallback on Heartbeat

```typescript
case 'heartbeat':
  if (!isConnected) {
    setIsConnected(true);  // Ensure connected
  }
  break;
```

### Fix 3: Better Error Logging

```typescript
eventSource.onerror = (error) => {
  console.error('EventSource readyState:', eventSource.readyState);
  console.error('EventSource URL:', eventSourceUrl);
};
```

## Testing Locally vs Production

### Local Development

If testing locally (http://localhost:5173):

1. **Backend must be running:**
   ```bash
   uvicorn app.main:app --reload
   ```

2. **Check CORS:**
   ```python
   # app/main.py
   cors_origins = [
       "http://localhost:5173",
       "http://localhost:3000"
   ]
   ```

3. **Test endpoint:**
   ```bash
   curl -N http://localhost:8000/ai/events
   ```

### Production (rebelz.app)

1. **Check deployment logs:**
   - Look for startup errors
   - Verify nginx started
   - Verify uvicorn started

2. **Test through nginx:**
   ```bash
   curl -N https://rebelz.app/ai/events
   ```

3. **Check nginx config:**
   ```bash
   # In container
   cat /etc/nginx/nginx.conf
   ```

## Quick Fixes to Try

### 1. Hard Refresh Browser

```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

Clears cached JavaScript that might have old connection logic.

### 2. Check Token

```javascript
// In browser console
localStorage.getItem('token')

// Should return a JWT token
// If null, you're not logged in
```

### 3. Restart Backend

```bash
# If using Docker
docker restart <container>

# If local
# Stop uvicorn and restart
```

### 4. Check Backend Logs

```bash
# Docker
docker logs -f <container>

# Look for:
# - SSE connection opened
# - Token validation errors
# - CORS errors
```

## Expected Timeline

When you enable AG-UI toggle:

```
T+0ms:    Toggle enabled
T+0ms:    Component mounts
T+10ms:   EventSource created
T+50ms:   Connection opened (onopen fires)
T+100ms:  Backend sends connection event
T+150ms:  Frontend receives event
T+150ms:  setIsConnected(true) ✅
T+30s:    First heartbeat
T+60s:    Second heartbeat
...
```

**If disconnected after 5 seconds:** Something is wrong with backend or routing.

## Verification Checklist

After deploying fixes:

- [ ] Backend running (`curl http://localhost:8000/health`)
- [ ] Nginx configured (`cat /etc/nginx/nginx.conf`)
- [ ] SSE endpoint accessible (`curl -N /ai/events`)
- [ ] CopilotKit endpoint accessible (`curl /api/copilotkit`)
- [ ] CORS configured (ALLOWED_ORIGINS set)
- [ ] Frontend rebuilt (`npm run build`)
- [ ] Hard refresh browser
- [ ] Check console logs (no errors)
- [ ] Check network tab (SSE connection open)
- [ ] Toggle shows "Connected" ✅

## Still Not Working?

1. **Share console logs:**
   - Open DevTools → Console
   - Copy all errors
   - Share in issue/chat

2. **Share network logs:**
   - Open DevTools → Network
   - Filter by "ai/events"
   - Right-click → Copy → Copy as cURL
   - Share the request

3. **Check backend logs:**
   ```bash
   docker logs <container> --tail 100
   ```

4. **Test with curl:**
   ```bash
   curl -v -N https://rebelz.app/ai/events
   ```
   Share the output.

## Summary

The connection should work automatically. If it shows "Disconnected":

1. Check browser console for errors
2. Check network tab for SSE connection
3. Test backend directly with curl
4. Verify nginx configuration
5. Check CORS settings
6. Hard refresh browser

Most issues are:
- Backend not running
- Nginx misconfigured
- CORS not allowing origin
- Token expired/invalid

