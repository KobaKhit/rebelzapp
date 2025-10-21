# Debugging Steps for Connection Issue

## What to Check Right Now

### 1. Open Browser Console (F12)

Look for these log messages:

```javascript
// Expected logs when you enable AG-UI toggle:
"Connecting to AG-UI SSE: /ai/events?token=..."
"AG-UI SSE connection opened (onopen fired)"
"AG-UI connection confirmed by backend: {status: 'connected', ...}"

// If you see errors:
"AG-UI SSE connection error: Event {...}"
"EventSource readyState: 2"  // 2 means CLOSED
```

### 2. Check Network Tab

1. Open DevTools → Network tab
2. Enable AG-UI toggle
3. Look for `/ai/events` request

**What to look for:**
- **Status Code:** Should be `200 OK`
- **Type:** Should be `eventsource`
- **Response:** Should show streaming data

**If you see:**
- `404` - Backend endpoint not found (nginx routing issue)
- `502/503` - Backend server not responding
- `(failed)` - CORS or network error

### 3. Quick Test Commands

Open browser console and run:

```javascript
// Test if you're logged in
console.log('Token:', localStorage.getItem('token'));

// Test SSE connection manually
const es = new EventSource('/ai/events?token=' + localStorage.getItem('token'));
es.onopen = () => console.log('✅ SSE opened');
es.onerror = (e) => console.error('❌ SSE error:', e);
es.onmessage = (e) => console.log('📨 Message:', e.data);
```

## Common Scenarios

### Scenario A: No Console Logs at All

**Problem:** Component not mounting or toggle not working

**Check:**
1. Is AG-UI toggle actually enabled (red/on)?
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear cache and reload

### Scenario B: "Connecting to..." but No "opened"

**Problem:** EventSource failing to connect

**Possible causes:**
1. Backend not running
2. Nginx not routing `/ai/events`
3. CORS blocking the request

**Test:**
```bash
# From your terminal
curl -N https://rebelz.app/ai/events

# Should output:
data: {"type":"connection","data":{"status":"connected"}}
```

### Scenario C: "opened" but Still Shows Disconnected

**Problem:** State not updating in UI

**This should be fixed now!** The new code sets `isConnected = true` on `onopen`.

### Scenario D: Connection Opens Then Immediately Closes

**Problem:** Backend closing connection or sending wrong format

**Check backend logs:**
```bash
# If you have access to server
docker logs <container-name> --tail 50
```

## Testing Locally vs Production

### If Testing on rebelz.app (Production)

The backend should be running. If it's not working:

1. **Check if backend is deployed:**
   ```bash
   curl https://rebelz.app/health
   # Should return: {"status":"ok"}
   ```

2. **Check if SSE endpoint exists:**
   ```bash
   curl -N https://rebelz.app/ai/events
   # Should keep connection open
   ```

3. **Check nginx config was updated:**
   - Did you redeploy after updating `nginx.prod.conf`?
   - Check deployment logs for nginx errors

### If Testing Locally (localhost:5173)

1. **Start backend:**
   ```bash
   cd /path/to/rebelzapp
   uvicorn app.main:app --reload
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test backend directly:**
   ```bash
   curl -N http://localhost:8000/ai/events
   ```

## What the Latest Fix Does

The updated code now:

1. **Sets connected immediately on `onopen`:**
   ```typescript
   eventSource.onopen = () => {
     setIsConnected(true);  // ✅ Optimistic
   };
   ```

2. **Confirms on backend event:**
   ```typescript
   case 'connection':
     setIsConnected(true);  // ✅ Confirmed
   ```

3. **Fallback on heartbeat:**
   ```typescript
   case 'heartbeat':
     if (!isConnected) {
       setIsConnected(true);  // ✅ Fallback
     }
   ```

## Next Steps

1. **Rebuild frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Commit and push:**
   ```bash
   git add frontend/src/components/EnhancedAGUIChat.tsx
   git commit -m "Set connected optimistically on EventSource open"
   git push
   ```

3. **After deployment:**
   - Hard refresh browser (Ctrl+Shift+R)
   - Open console (F12)
   - Enable AG-UI toggle
   - Share console output

## What to Share

If still not working, please share:

1. **Console logs** (everything in console when you enable toggle)
2. **Network tab** (screenshot of `/ai/events` request)
3. **Are you testing locally or on rebelz.app?**
4. **Backend health check:**
   ```bash
   curl https://rebelz.app/health
   # or
   curl http://localhost:8000/health
   ```

This will help me identify the exact issue!

