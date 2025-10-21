# Nginx Configuration Fix for CopilotKit & AG-UI

## Problem

After deployment, the following errors occurred:

1. **404 on `/api/copilotkit`** - CopilotKit endpoint not accessible
2. **SSE MIME type error on `/ai/events`** - EventSource receiving HTML instead of event-stream

```
POST https://rebelz.app/api/copilotkit 404 (Not Found)
EventSource's response has a MIME type ("text/html") that is not "text/event-stream"
```

## Root Cause

The nginx configuration in the Dockerfile was missing:
1. Route for `/api/copilotkit` endpoint
2. Proper SSE configuration for `/ai/` endpoints
3. Routes for other backend endpoints (auth, users, events, etc.)

## Solution

Updated the Dockerfile's nginx configuration to include:

### 1. API Endpoint Proxy
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_buffering off;  # Important for SSE
    proxy_cache off;      # Important for SSE
    # ... other headers
}
```

### 2. AI Endpoints with SSE Support
```nginx
location /ai/ {
    proxy_pass http://127.0.0.1:8000/ai/;
    proxy_set_header Connection "";
    proxy_http_version 1.1;
    proxy_buffering off;              # Disable buffering for SSE
    proxy_cache off;                  # Disable caching for SSE
    proxy_read_timeout 86400s;        # Long timeout for SSE (24 hours)
    chunked_transfer_encoding off;    # Important for SSE
    # ... other headers
}
```

### 3. Other Backend Endpoints
```nginx
location ~ ^/(auth|users|events|roles|permissions|registrations|chat|uploads)/ {
    proxy_pass http://127.0.0.1:8000;
    # ... headers
}
```

## Key Nginx Settings for SSE

For Server-Sent Events to work properly, these settings are critical:

1. **`proxy_buffering off`** - Disables response buffering so events stream immediately
2. **`proxy_cache off`** - Disables caching of responses
3. **`proxy_read_timeout 86400s`** - Long timeout (24 hours) for persistent connections
4. **`chunked_transfer_encoding off`** - Prevents chunked encoding issues
5. **`proxy_http_version 1.1`** - Use HTTP/1.1 for persistent connections
6. **`proxy_set_header Connection ""`** - Clear Connection header

## Files Changed

- ✅ `Dockerfile` - Updated nginx configuration

## Deployment Steps

1. **Commit the changes:**
   ```bash
   git add Dockerfile
   git commit -m "Fix nginx configuration for CopilotKit and AG-UI SSE support"
   git push origin main
   ```

2. **Redeploy on DigitalOcean:**
   - The app will automatically rebuild with the new Dockerfile
   - Wait for deployment to complete

3. **Verify the fix:**
   ```bash
   # Test CopilotKit endpoint
   curl -X POST https://rebelz.app/api/copilotkit \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "test"}]}'
   
   # Test AG-UI SSE endpoint
   curl -N https://rebelz.app/ai/events
   ```

4. **Test in browser:**
   - Navigate to AI Chat page
   - Enable AG-UI toggle
   - Check browser console - should see:
     - ✅ No 404 errors
     - ✅ EventSource connection established
     - ✅ SSE events streaming

## Verification Checklist

After deployment, verify:

- [ ] No 404 errors on `/api/copilotkit`
- [ ] No MIME type errors on `/ai/events`
- [ ] EventSource connection shows "Connected"
- [ ] Can send messages and receive responses
- [ ] CopilotKit actions work
- [ ] AG-UI event cards display properly

## Troubleshooting

### Still getting 404 on /api/copilotkit

**Check:**
1. Backend is running on port 8000
2. FastAPI route is registered: `app.include_router(copilotkit_router.router, prefix="/api/copilotkit")`
3. Nginx is proxying correctly

**Debug:**
```bash
# Check if backend is accessible
curl http://localhost:8000/api/copilotkit

# Check nginx logs
tail -f /tmp/nginx_error.log
```

### Still getting MIME type error on /ai/events

**Check:**
1. Response has correct Content-Type header: `text/event-stream`
2. Nginx isn't buffering the response
3. Backend is sending proper SSE format

**Debug:**
```bash
# Test SSE endpoint directly
curl -N http://localhost:8000/ai/events

# Should see:
# data: {"type":"connection","data":{...}}
```

### Connection drops after 60 seconds

**Issue:** Default nginx timeout is 60 seconds

**Fix:** Already applied in the configuration:
```nginx
proxy_read_timeout 86400s;  # 24 hours
```

## Additional Notes

### Why the separate /ai/ location?

The `/ai/` endpoints need special SSE configuration that other API endpoints don't need. Separating them allows:
- Specific SSE settings for `/ai/`
- Standard settings for `/api/`
- Better performance and reliability

### Why disable buffering?

Nginx buffers responses by default to optimize performance. For SSE:
- Buffering delays events
- Events should stream immediately
- Disabling buffering ensures real-time delivery

### Why such a long timeout?

SSE connections are meant to stay open:
- Heartbeat every 30 seconds keeps connection alive
- 24-hour timeout allows for long-running sessions
- Prevents premature connection drops

## Related Documentation

- [Integration Guide](./COPILOTKIT_AGUI_INTEGRATION.md)
- [TypeScript Fixes](./TYPESCRIPT_FIXES.md)
- [Quick Reference](./QUICK_REFERENCE_COPILOTKIT_AGUI.md)

## Summary

The fix adds proper nginx routing and SSE configuration for:
- ✅ `/api/copilotkit` - CopilotKit endpoint
- ✅ `/ai/*` - AG-UI endpoints with SSE support
- ✅ Other backend endpoints

After redeployment, both CopilotKit and AG-UI should work correctly! 🎉

