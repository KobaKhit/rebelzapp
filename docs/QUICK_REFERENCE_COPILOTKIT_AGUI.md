# CopilotKit & AG-UI Quick Reference

## Quick Start

### Backend Setup (Already Done ✅)

The backend is fully configured. No additional setup needed!

### Frontend Usage

```tsx
import { CopilotKitWrapper } from './components/CopilotKitProvider';
import { EnhancedAGUIChat } from './components/EnhancedAGUIChat';

function MyPage() {
  return (
    <CopilotKitWrapper runtimeUrl="/api/copilotkit">
      <EnhancedAGUIChat
        endpoint="/ai"
        enableCopilotActions={true}
      />
    </CopilotKitWrapper>
  );
}
```

## API Endpoints Cheat Sheet

### CopilotKit

```bash
# Get available actions
GET /api/copilotkit

# Chat (streaming)
POST /api/copilotkit
Content-Type: application/json
Authorization: Bearer <token>

{
  "messages": [
    {"role": "user", "content": "Your message"}
  ]
}
```

### AG-UI

```bash
# SSE Connection
GET /ai/events?token=<token>

# Send Message
POST /ai/message
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "message",
  "data": {
    "role": "user",
    "content": "Your message"
  }
}
```

## Pydantic Models

### Request Models

```python
from app.schemas.agui import AGUIMessageRequest, AGUIMessage

# Create a message request
request = AGUIMessageRequest(
    type="message",
    data=AGUIMessage(
        role="user",
        content="Hello"
    )
)
```

### Response Models

```python
from app.schemas.agui import AGUIMessageResponse, AGUITextData

# Create a text response
response = AGUIMessageResponse(
    type="message",
    data=AGUITextData(
        role="assistant",
        content="Hello! How can I help?"
    ).model_dump()
)
```

## CopilotKit Actions

### Available Actions

1. **createEvent** - Create new events
   ```typescript
   // Triggered by: "Create a basketball workshop for Friday"
   {
     title: string,
     description: string,
     eventType: string,
     startDateTime: string (ISO),
     endDateTime: string (ISO)
   }
   ```

2. **searchEvents** - Search for events
   ```typescript
   // Triggered by: "Find all basketball classes"
   {
     query?: string,
     eventType?: string
   }
   ```

3. **registerForEvent** - Register for event
   ```typescript
   // Triggered by: "Register me for event 123"
   {
     eventId: number
   }
   ```

### Adding New Actions

```typescript
useCopilotAction({
  name: "myAction",
  description: "What this action does",
  parameters: [
    {
      name: "param1",
      type: "string",
      description: "Parameter description",
      required: true
    }
  ],
  handler: async ({ param1 }) => {
    // Your logic here
    return "Success message";
  }
});
```

## Common Patterns

### Backend: Create AG-UI Endpoint

```python
from app.schemas.agui import AGUIMessageRequest, AGUIMessageResponse

@router.post("/my-endpoint", response_model=AGUIMessageResponse)
async def my_endpoint(
    request: AGUIMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> AGUIMessageResponse:
    # Process request
    result = process(request.data.content)
    
    # Return response
    return AGUIMessageResponse(
        type="message",
        data={"role": "assistant", "content": result}
    )
```

### Frontend: Use CopilotKit Context

```typescript
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';

function MyComponent() {
  // Make data readable to CopilotKit
  useCopilotReadable({
    description: "Current user data",
    value: { userId: 123, name: "John" }
  });
  
  // Add custom action
  useCopilotAction({
    name: "myAction",
    description: "Do something",
    parameters: [...],
    handler: async (params) => {
      // Handle action
    }
  });
}
```

## Debugging

### Backend Logs

```python
# Add logging to your endpoint
import traceback

try:
    # Your code
    pass
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
```

### Frontend Console

```typescript
// Enable CopilotKit dev console
<CopilotKit
  runtimeUrl="/api/copilotkit"
  showDevConsole={true}  // Shows debug info
>
```

### Network Debugging

1. Open Browser DevTools → Network tab
2. Filter by "EventStream" to see SSE connections
3. Look for `/ai/events` and `/api/copilotkit`
4. Check request/response headers and data

## Error Handling

### Backend

```python
from app.schemas.agui import AGUIMessageResponse, AGUIErrorData

try:
    # Your logic
    pass
except Exception as e:
    return AGUIMessageResponse(
        type="error",
        data=AGUIErrorData(
            message=str(e),
            code="ERROR_CODE"
        ).model_dump()
    )
```

### Frontend

```typescript
try {
  const response = await fetch('/ai/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error('Request failed');
  }
  
  const data = await response.json();
  
  if (data.type === 'error') {
    // Handle error
    console.error(data.data.message);
  }
} catch (error) {
  // Handle network error
  console.error('Network error:', error);
}
```

## Testing

### Test Backend Endpoint

```python
import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/ai/message",
            json={
                "type": "message",
                "data": {"role": "user", "content": "Test"}
            },
            headers={"Authorization": "Bearer YOUR_TOKEN"}
        )
        print(response.json())

asyncio.run(test())
```

### Test Frontend Component

```typescript
// In your test file
import { render, screen } from '@testing-library/react';
import { EnhancedAGUIChat } from './EnhancedAGUIChat';

test('renders chat component', () => {
  render(<EnhancedAGUIChat endpoint="/ai" />);
  expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
});
```

## Performance Tips

1. **Memoize Headers:**
   ```typescript
   const headers = useMemo(() => ({
     'Authorization': `Bearer ${token}`
   }), [token]);
   ```

2. **Cleanup SSE Connections:**
   ```typescript
   useEffect(() => {
     const eventSource = new EventSource(url);
     return () => eventSource.close();
   }, []);
   ```

3. **Limit Message History:**
   ```typescript
   const MAX_MESSAGES = 50;
   setMessages(prev => [...prev.slice(-MAX_MESSAGES), newMessage]);
   ```

## Security Checklist

- ✅ Always validate tokens on backend
- ✅ Use HTTPS in production
- ✅ Sanitize user input
- ✅ Rate limit API endpoints
- ✅ Validate Pydantic models
- ✅ Don't expose sensitive data in errors

## Useful Commands

```bash
# Run backend
uvicorn app.main:app --reload

# Run frontend
cd frontend && npm run dev

# Test integration
python scripts/test_copilotkit_agui.py

# Check logs
tail -f logs/app.log

# Format code
black app/
prettier --write frontend/src/
```

## Resources

- [Full Integration Guide](./COPILOTKIT_AGUI_INTEGRATION.md)
- [Integration Summary](./INTEGRATION_SUMMARY.md)
- [CopilotKit Docs](https://docs.copilotkit.ai/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## Need Help?

1. Check the [Integration Guide](./COPILOTKIT_AGUI_INTEGRATION.md) for detailed info
2. Look at existing endpoints for examples
3. Check browser console and network tab
4. Review backend logs for errors
5. Run test script to verify endpoints

