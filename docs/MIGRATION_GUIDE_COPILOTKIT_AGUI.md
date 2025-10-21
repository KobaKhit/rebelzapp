# Migration Guide: CopilotKit & AG-UI Integration

## Overview

This guide helps you migrate from the old CopilotKit/AG-UI implementation to the new Pydantic-based implementation.

## What Changed?

### Backend Changes

#### 1. New Pydantic Models

**Before:**
```python
# Manual dict handling
body = await request.json()
message = body.get('data', {}).get('content', '')
```

**After:**
```python
# Pydantic validation
from app.schemas.agui import AGUIMessageRequest

async def endpoint(request: AGUIMessageRequest):
    message = request.data.content
```

#### 2. CopilotKit Endpoint

**Before:**
```python
@router.post("")
async def copilotkit_runtime(request: Request):
    body = await request.json()
    if "messages" in body:
        return await handle_copilotkit_chat(body, user, db)
```

**After:**
```python
@router.post("")
async def copilotkit_runtime(request: Request):
    body = await request.json()
    if "messages" in body:
        return StreamingResponse(
            handle_copilotkit_chat_stream(body, user, db),
            media_type="text/event-stream"
        )
```

#### 3. AG-UI Message Endpoint

**Before:**
```python
@router.post("/message")
async def ag_ui_message(request: Request):
    body = await request.json()
    return {"type": "message", "data": {...}}
```

**After:**
```python
@router.post("/message", response_model=AGUIMessageResponse)
async def ag_ui_message(
    message_request: AGUIMessageRequest,
    current_user: User = Depends(get_current_user)
) -> AGUIMessageResponse:
    return AGUIMessageResponse(
        type="message",
        data=AGUITextData(...).model_dump()
    )
```

#### 4. SSE Endpoint

**Before:**
```python
async def event_stream():
    yield f"data: {json.dumps({'type': 'connection'})}\n\n"
```

**After:**
```python
async def event_stream():
    connection_data = AGUIEvent(
        type="connection",
        data=AGUIConnectionData(...).model_dump()
    )
    yield f"data: {connection_data.model_dump_json()}\n\n"
```

### Frontend Changes

#### 1. CopilotKit Provider

**Before:**
```typescript
const headers = token ? {
  'Authorization': `Bearer ${token}`
} : undefined;

<CopilotKit runtimeUrl={url} headers={headers}>
```

**After:**
```typescript
const headers = useMemo(() => {
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
}, [token]);

<CopilotKit 
  runtimeUrl={url} 
  headers={headers}
  showDevConsole={import.meta.env.DEV}
>
```

#### 2. EnhancedAGUIChat Component

**Before:**
```typescript
// Mixed SSE and POST logic
const eventSource = new EventSource(`/api/copilotkit?token=${token}`);
```

**After:**
```typescript
// Separate SSE for AG-UI
const eventSource = new EventSource(`/ai/events?token=${token}`);

// POST to AG-UI message endpoint
await fetch('/ai/message', {
  method: 'POST',
  body: JSON.stringify({
    type: 'message',
    data: { role: 'user', content: message }
  })
});
```

## Step-by-Step Migration

### Step 1: Update Backend Dependencies

No new dependencies needed! Everything uses existing packages.

### Step 2: Add Pydantic Models

Create `app/schemas/agui.py` with the new models (already done ✅).

### Step 3: Update Your Endpoints

If you have custom AG-UI endpoints, update them:

**Old Code:**
```python
@router.post("/my-endpoint")
async def my_endpoint(request: Request):
    body = await request.json()
    content = body.get('data', {}).get('content', '')
    return {"type": "message", "data": {"content": "response"}}
```

**New Code:**
```python
from app.schemas.agui import AGUIMessageRequest, AGUIMessageResponse, AGUITextData

@router.post("/my-endpoint", response_model=AGUIMessageResponse)
async def my_endpoint(
    request: AGUIMessageRequest,
    current_user: User = Depends(get_current_user)
) -> AGUIMessageResponse:
    content = request.data.content
    return AGUIMessageResponse(
        type="message",
        data=AGUITextData(
            role="assistant",
            content="response"
        ).model_dump()
    )
```

### Step 4: Update Frontend Components

If you have custom chat components:

**Old Code:**
```typescript
const eventSource = new EventSource('/api/copilotkit');
```

**New Code:**
```typescript
// For AG-UI SSE
const eventSource = new EventSource('/ai/events');

// For messages
await fetch('/ai/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'message',
    data: { role: 'user', content: message }
  })
});
```

### Step 5: Update CopilotKit Actions

No changes needed! Actions work the same way.

### Step 6: Test Everything

Run the test script:
```bash
python scripts/test_copilotkit_agui.py
```

## Breaking Changes

### 1. Response Format

**Before:**
```json
{
  "data": {
    "content": "message"
  }
}
```

**After:**
```json
{
  "type": "message",
  "data": {
    "role": "assistant",
    "content": "message"
  }
}
```

**Fix:** Update your frontend to handle the new format.

### 2. SSE Endpoint

**Before:** `/api/copilotkit` for both CopilotKit and AG-UI

**After:** 
- `/api/copilotkit` for CopilotKit only
- `/ai/events` for AG-UI SSE

**Fix:** Update EventSource URL in your components.

### 3. Authentication

**Before:** Token only in header

**After:** Token in header OR query param (for SSE)

**Fix:** No changes needed, both methods supported.

## Compatibility

### Backward Compatibility

The new implementation is **mostly backward compatible**:

✅ CopilotKit actions work the same
✅ Authentication methods unchanged
✅ Message format compatible (with type field)
⚠️ SSE endpoint changed (use `/ai/events` for AG-UI)

### Forward Compatibility

The new implementation is designed for future enhancements:

✅ Pydantic models easy to extend
✅ Streaming responses ready for token-by-token
✅ Type safety prevents breaking changes

## Common Migration Issues

### Issue 1: "Validation Error" on POST

**Problem:** Getting 422 validation errors

**Solution:** Check your request matches Pydantic models:
```python
# Correct format
{
  "type": "message",
  "data": {
    "role": "user",
    "content": "text"
  }
}
```

### Issue 2: SSE Connection Failing

**Problem:** EventSource not connecting

**Solution:** Update URL to `/ai/events`:
```typescript
const eventSource = new EventSource('/ai/events?token=' + token);
```

### Issue 3: CopilotKit Not Streaming

**Problem:** Getting JSON instead of stream

**Solution:** Backend now returns StreamingResponse. No frontend changes needed.

### Issue 4: Type Errors in TypeScript

**Problem:** TypeScript complaining about types

**Solution:** Update your interfaces to match new format:
```typescript
interface AGUIMessageResponse {
  type: 'message' | 'events' | 'error';
  data: Record<string, any>;
}
```

## Testing Your Migration

### 1. Backend Tests

```python
# Test Pydantic validation
from app.schemas.agui import AGUIMessageRequest, AGUIMessage

request = AGUIMessageRequest(
    type="message",
    data=AGUIMessage(role="user", content="test")
)
assert request.data.content == "test"
```

### 2. Frontend Tests

```typescript
// Test message sending
const response = await fetch('/ai/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'message',
    data: { role: 'user', content: 'test' }
  })
});

const data = await response.json();
expect(data.type).toBe('message');
```

### 3. Integration Tests

Run the full test suite:
```bash
python scripts/test_copilotkit_agui.py
```

## Rollback Plan

If you need to rollback:

1. **Backend:** Revert changes to `app/api/routers/copilotkit.py` and `app/api/routers/ai.py`
2. **Frontend:** Revert changes to `CopilotKitProvider.tsx` and `EnhancedAGUIChat.tsx`
3. **Remove:** Delete `app/schemas/agui.py`

Git commands:
```bash
# Revert specific files
git checkout HEAD~1 app/api/routers/copilotkit.py
git checkout HEAD~1 app/api/routers/ai.py
git checkout HEAD~1 frontend/src/components/CopilotKitProvider.tsx
git checkout HEAD~1 frontend/src/components/EnhancedAGUIChat.tsx

# Remove new file
git rm app/schemas/agui.py
```

## Getting Help

If you encounter issues during migration:

1. Check the [Integration Guide](./COPILOTKIT_AGUI_INTEGRATION.md)
2. Review the [Quick Reference](./QUICK_REFERENCE_COPILOTKIT_AGUI.md)
3. Look at the test script for examples
4. Check browser console and network tab
5. Review backend logs

## Checklist

Use this checklist to track your migration:

- [ ] Backend: Added Pydantic models (`app/schemas/agui.py`)
- [ ] Backend: Updated CopilotKit endpoint (streaming)
- [ ] Backend: Updated AG-UI endpoints (Pydantic validation)
- [ ] Backend: Updated SSE endpoint (Pydantic models)
- [ ] Frontend: Updated CopilotKit provider (memoization)
- [ ] Frontend: Updated chat component (separate SSE)
- [ ] Frontend: Updated message sending (new format)
- [ ] Testing: Ran test script
- [ ] Testing: Manual testing in browser
- [ ] Testing: Checked SSE connections
- [ ] Documentation: Updated custom endpoints
- [ ] Deployment: Updated environment variables (if needed)
- [ ] Monitoring: Set up logging/analytics

## Next Steps

After successful migration:

1. Monitor error logs for any issues
2. Check SSE connection stability
3. Verify all CopilotKit actions work
4. Test with real users
5. Optimize based on feedback

## Summary

The new implementation provides:
- ✅ Better type safety with Pydantic
- ✅ Improved streaming responses
- ✅ Cleaner separation of concerns
- ✅ Better error handling
- ✅ Easier to maintain and extend

Migration is straightforward and mostly backward compatible!

