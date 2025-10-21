# CopilotKit & AG-UI Integration Guide

## Overview

This document describes the complete integration of CopilotKit and AG-UI (Agentic UI) into the Rebelz application. Both frameworks are now properly integrated with Pydantic for type safety and validation.

## Architecture

### Backend Components

#### 1. Pydantic Models (`app/schemas/agui.py`)

We've created comprehensive Pydantic models for the AG-UI protocol:

- `AGUIMessage`: Message format for user/assistant communication
- `AGUIEvent`: Generic event format for AG-UI protocol
- `AGUIConnectionData`: Connection event data
- `AGUIHeartbeatData`: Heartbeat event data
- `AGUIMessageRequest`: Request schema for message endpoint
- `AGUIMessageResponse`: Response schema for message endpoint
- `AGUIEventsData`: Structured events data
- `AGUITextData`: Text response data
- `AGUIErrorData`: Error response data

All models use Pydantic v2 features for validation and serialization.

#### 2. CopilotKit Backend (`app/api/routers/copilotkit.py`)

**Endpoints:**

- `GET /api/copilotkit` - Server-Sent Events (SSE) endpoint for real-time communication
- `POST /api/copilotkit` - Main runtime endpoint for chat and actions

**Features:**

- Streaming responses using SSE format
- Action support (createEvent, searchEvents, registerForEvent)
- Authentication via Bearer token (optional)
- Proper error handling with stack traces in development

**Protocol:**

CopilotKit expects:
1. POST requests with `messages` array for chat
2. Streaming responses in SSE format
3. Action definitions returned on GET requests

**Example Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Create a basketball workshop"}
  ]
}
```

**Example Response (SSE):**
```
data: {"type": "thinking"}

data: {"type": "message", "message": {"role": "assistant", "content": "I'll help you create that workshop..."}}

data: {"type": "done"}
```

#### 3. AG-UI Backend (`app/api/routers/ai.py`)

**Endpoints:**

- `GET /ai/events` - SSE endpoint for AG-UI real-time communication
- `POST /ai/message` - Message processing endpoint with Pydantic validation
- `POST /ai/chat` - Traditional chat endpoint
- `GET /ai/suggestions` - Personalized suggestions
- `GET /ai/help/topics` - Help topics

**Features:**

- Full Pydantic validation on all endpoints
- SSE connection with heartbeat (every 30 seconds)
- Structured responses (text, events, errors)
- Authentication via Bearer token or query parameter
- Integration with RebelzAgent (Pydantic AI)

**Example Message Request:**
```json
{
  "type": "message",
  "data": {
    "role": "user",
    "content": "Show me my upcoming events"
  }
}
```

**Example Response:**
```json
{
  "type": "events",
  "data": {
    "events": [...],
    "title": "Your Upcoming Events (3)",
    "message": "Here are your 3 upcoming events:"
  }
}
```

### Frontend Components

#### 1. CopilotKit Provider (`frontend/src/components/CopilotKitProvider.tsx`)

**Features:**

- Memoized headers to prevent unnecessary re-renders
- Automatic token injection from localStorage
- Development console in dev mode
- Support for sidebar mode

**Usage:**

```tsx
import { CopilotKitWrapper } from './components/CopilotKitProvider';

<CopilotKitWrapper runtimeUrl="/api/copilotkit">
  <YourComponent />
</CopilotKitWrapper>
```

#### 2. Enhanced AG-UI Chat (`frontend/src/components/EnhancedAGUIChat.tsx`)

**Features:**

- Dual mode: AG-UI + CopilotKit or AG-UI only
- SSE connection to `/ai/events` for real-time updates
- Message posting to `/ai/message` for processing
- Automatic reconnection on connection loss
- CopilotKit actions integration
- Structured event display (using AGUIEventCard)
- Typing indicators
- Connection status display

**CopilotKit Actions:**

1. **createEvent** - Create new events via natural language
2. **searchEvents** - Search for events with filters
3. **registerForEvent** - Register for events by ID

**Usage:**

```tsx
import { EnhancedAGUIChat } from './components/EnhancedAGUIChat';

<EnhancedAGUIChat
  endpoint="/ai"
  enableCopilotActions={true}
  onMessage={(msg) => console.log('Message:', msg)}
  onEvent={(evt) => console.log('Event:', evt)}
/>
```

## Integration Flow

### 1. CopilotKit Chat Flow

```
User types message
    ↓
CopilotKit captures input
    ↓
POST /api/copilotkit with messages array
    ↓
Backend streams response via SSE
    ↓
CopilotKit displays response
    ↓
If action needed, CopilotKit calls action handler
    ↓
Action handler calls backend API
    ↓
Result displayed to user
```

### 2. AG-UI Chat Flow

```
Component mounts
    ↓
Establishes SSE connection to /ai/events
    ↓
Receives connection confirmation
    ↓
User sends message
    ↓
POST /ai/message with AGUIMessageRequest
    ↓
Backend processes with RebelzAgent
    ↓
Returns AGUIMessageResponse (text/events/error)
    ↓
Component displays structured response
    ↓
SSE heartbeat keeps connection alive
```

## Configuration

### Backend Configuration

No additional configuration needed. The integration uses existing:
- OpenAI API key from environment
- Pydantic AI agent configuration
- FastAPI CORS settings

### Frontend Configuration

Update `frontend/src/pages/AIChat.tsx` to enable/disable features:

```tsx
const [useAGUI, setUseAGUI] = useState(true);  // Enable AG-UI
const [useCopilotKit, setUseCopilotKit] = useState(true);  // Enable CopilotKit
```

## Testing

### Manual Testing

1. **Start Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Test CopilotKit:**
   - Navigate to AI Chat page
   - Enable AG-UI and CopilotKit toggles
   - Try: "Create a basketball workshop for next Friday at 3pm"
   - Verify action is executed

4. **Test AG-UI:**
   - Keep AG-UI enabled
   - Try: "Show me my upcoming events"
   - Verify structured event cards are displayed

5. **Test SSE Connection:**
   - Open browser DevTools → Network tab
   - Look for `/ai/events` connection (EventStream)
   - Should see heartbeat events every 30 seconds

### API Testing

**Test CopilotKit Endpoint:**
```bash
curl -X POST http://localhost:8000/api/copilotkit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

**Test AG-UI Message Endpoint:**
```bash
curl -X POST http://localhost:8000/ai/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "message", "data": {"role": "user", "content": "Show my events"}}'
```

**Test AG-UI SSE Endpoint:**
```bash
curl -N http://localhost:8000/ai/events?token=YOUR_TOKEN
```

## Troubleshooting

### CopilotKit Issues

**Problem:** CopilotKit not connecting
- Check browser console for errors
- Verify `/api/copilotkit` endpoint is accessible
- Check CORS settings in backend
- Verify token is being sent in headers

**Problem:** Actions not working
- Check action handler implementation
- Verify API endpoints are accessible
- Check authentication token is valid

### AG-UI Issues

**Problem:** SSE connection failing
- Check browser support for EventSource
- Verify `/ai/events` endpoint is accessible
- Check token is being passed correctly
- Look for CORS errors

**Problem:** Messages not being processed
- Check `/ai/message` endpoint
- Verify Pydantic validation is passing
- Check RebelzAgent is initialized
- Verify OpenAI API key is set

### Common Issues

**Problem:** "No content provided" error
- Ensure message data structure is correct
- Check Pydantic model validation

**Problem:** Connection drops frequently
- Check server logs for errors
- Verify heartbeat is being sent (every 30s)
- Check network stability

## Best Practices

1. **Error Handling:**
   - Always wrap API calls in try-catch
   - Provide user-friendly error messages
   - Log errors for debugging

2. **Performance:**
   - Use memoization for headers
   - Implement proper cleanup in useEffect
   - Limit message history to prevent memory issues

3. **Security:**
   - Always validate tokens on backend
   - Use HTTPS in production
   - Sanitize user input
   - Rate limit API endpoints

4. **User Experience:**
   - Show connection status
   - Display typing indicators
   - Implement auto-reconnect
   - Provide fallback UI for errors

## Future Enhancements

1. **Streaming Responses:**
   - Implement token-by-token streaming for better UX
   - Add support for partial responses

2. **Advanced Actions:**
   - Add more CopilotKit actions
   - Implement action confirmation dialogs
   - Add action history

3. **Enhanced AG-UI:**
   - Add support for rich media (images, files)
   - Implement voice input
   - Add conversation history persistence

4. **Analytics:**
   - Track action usage
   - Monitor connection quality
   - Analyze user queries

## References

- [CopilotKit Documentation](https://docs.copilotkit.ai/)
- [AG-UI Documentation](https://github.com/ag-ui/ag-ui)
- [Pydantic AI Documentation](https://ai.pydantic.dev/)
- [FastAPI SSE Guide](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)

