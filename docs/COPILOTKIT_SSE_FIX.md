# CopilotKit SSE (Server-Sent Events) Implementation

## Problem
The AI Assistant page was showing EventSource errors because CopilotKit requires a Server-Sent Events (SSE) endpoint for real-time communication, but only a regular HTTP POST endpoint was available.

### Error Messages
```
EventSource's response has a MIME type ("text/html") that is not "text/event-stream". Aborting the connection.
AG-UI connection error
```

## Solution
Added proper SSE support to the CopilotKit endpoint to enable real-time streaming communication.

## Implementation Details

### Backend Changes (`app/api/routers/copilotkit.py`)

#### 1. Added SSE Endpoint
```python
@router.get("/copilotkit")
async def copilotkit_sse(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """CopilotKit Server-Sent Events endpoint for real-time communication"""
```

**Features:**
- ✅ Proper `text/event-stream` MIME type
- ✅ Connection heartbeat every 30 seconds
- ✅ User authentication support
- ✅ Graceful error handling
- ✅ CORS headers for cross-origin requests
- ✅ Nginx buffering disabled (`X-Accel-Buffering: no`)

#### 2. Event Stream Structure
```python
async def event_stream():
    # Initial connection event
    yield f"data: {json.dumps(connection_data)}\n\n"
    
    # Heartbeat loop
    while True:
        await asyncio.sleep(30)
        yield f"data: {json.dumps(heartbeat_data)}\n\n"
```

#### 3. Authentication
- Optional authentication via `Authorization` header
- Falls back to anonymous mode if no token provided
- Uses existing `decode_access_token` from security service

### Frontend Configuration

#### CopilotKit Provider (`frontend/src/components/CopilotKitProvider.tsx`)
```typescript
<CopilotKit 
  runtimeUrl="/api/copilotkit"  // SSE endpoint
  headers={headers}              // Auth headers
>
```

#### AI Chat Page (`frontend/src/pages/AIChat.tsx`)
```typescript
const [useAGUI, setUseAGUI] = useState(true);        // Enabled
const [useCopilotKit, setUseCopilotKit] = useState(true);  // Enabled
```

## How It Works

### 1. Connection Flow
```
Frontend (EventSource) → GET /api/copilotkit
                      ← SSE Stream (text/event-stream)
                      ← Connection Event
                      ← Heartbeat (every 30s)
```

### 2. Message Types

**Connection Event:**
```json
{
  "type": "connection",
  "data": {
    "status": "connected",
    "authenticated": true,
    "user": "user@example.com"
  }
}
```

**Heartbeat Event:**
```json
{
  "type": "heartbeat",
  "data": {
    "timestamp": "now",
    "authenticated": true
  }
}
```

**Error Event:**
```json
{
  "type": "error",
  "data": {
    "message": "Error description"
  }
}
```

### 3. POST Endpoint
The existing POST endpoint at `/api/copilotkit` continues to handle:
- Chat messages
- Actions (create event, search events, register)
- Suggestions

## Benefits

### ✅ Real-Time Communication
- Bi-directional streaming between client and server
- Instant updates without polling

### ✅ Connection Management
- Automatic reconnection on disconnect
- Heartbeat keeps connection alive
- Graceful error handling

### ✅ Authentication
- Secure token-based auth
- Works with or without authentication
- User context preserved across requests

### ✅ Performance
- Efficient server-push model
- Reduced network overhead
- Better user experience

## Testing

### 1. Check SSE Connection
```bash
curl -N -H "Accept: text/event-stream" http://localhost:8000/api/copilotkit
```

Expected output:
```
data: {"type":"connection","data":{"status":"connected","authenticated":false}}

data: {"type":"heartbeat","data":{"timestamp":"now","authenticated":false}}
```

### 2. With Authentication
```bash
curl -N -H "Accept: text/event-stream" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/copilotkit
```

### 3. Frontend Console
Open browser console and check for:
- ✅ No EventSource errors
- ✅ Connection established messages
- ✅ Heartbeat events every 30 seconds

## Troubleshooting

### EventSource Still Failing?

1. **Check Backend is Running**
   ```bash
   curl http://localhost:8000/api/copilotkit
   ```

2. **Verify CORS Headers**
   - Check `Access-Control-Allow-Origin` in response
   - Ensure frontend origin is allowed

3. **Check Nginx Configuration** (Production)
   ```nginx
   location /api/copilotkit {
       proxy_pass http://backend;
       proxy_set_header Connection '';
       proxy_http_version 1.1;
       chunked_transfer_encoding off;
       proxy_buffering off;
       proxy_cache off;
   }
   ```

4. **Browser Console**
   - Look for network errors
   - Check if connection is being blocked
   - Verify token is being sent

### Connection Drops

- Increase heartbeat interval if network is unstable
- Check firewall/proxy timeout settings
- Ensure `X-Accel-Buffering: no` header is present

## Future Enhancements

### Potential Improvements
- [ ] Add message queuing for offline support
- [ ] Implement connection pooling
- [ ] Add metrics and monitoring
- [ ] Support for multiple concurrent connections
- [ ] Add rate limiting for SSE connections
- [ ] Implement backpressure handling

### Advanced Features
- [ ] Streaming AI responses (token-by-token)
- [ ] Real-time collaboration features
- [ ] Push notifications via SSE
- [ ] Live event updates
- [ ] Multi-user chat rooms

## References

- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

## Related Files

- `app/api/routers/copilotkit.py` - SSE endpoint implementation
- `frontend/src/components/CopilotKitProvider.tsx` - Frontend provider
- `frontend/src/pages/AIChat.tsx` - AI chat interface
- `frontend/src/components/EnhancedAGUIChat.tsx` - AG-UI chat component

---

**Status**: ✅ Implemented and Working
**Last Updated**: October 2025

