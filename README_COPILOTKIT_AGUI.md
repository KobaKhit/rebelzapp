# CopilotKit & AG-UI Integration ✨

> Complete integration of CopilotKit and AG-UI (Agentic UI) with Pydantic for the Rebelz application

## 🎯 What's New

This integration brings powerful AI-powered chat capabilities to your application:

- **CopilotKit Integration** - Natural language actions and commands
- **AG-UI Integration** - Structured, agentic user interfaces
- **Pydantic Validation** - Type-safe API communication
- **Streaming Responses** - Real-time, responsive chat experience
- **Full Type Safety** - End-to-end type checking

## 🚀 Quick Start

### For Users

1. Navigate to the AI Chat page
2. Toggle "AG-UI" and "CopilotKit" on
3. Start chatting! Try:
   - "Create a basketball workshop for next Friday"
   - "Show me my upcoming events"
   - "Find all sports classes"

### For Developers

```bash
# Backend is already configured! Just run:
uvicorn app.main:app --reload

# Frontend is ready too:
cd frontend && npm run dev
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Integration Guide](docs/COPILOTKIT_AGUI_INTEGRATION.md) | Complete technical guide (300+ lines) |
| [Integration Summary](docs/INTEGRATION_SUMMARY.md) | What was done and how it works |
| [Quick Reference](docs/QUICK_REFERENCE_COPILOTKIT_AGUI.md) | Cheat sheet for common tasks |
| [Migration Guide](docs/MIGRATION_GUIDE_COPILOTKIT_AGUI.md) | How to migrate existing code |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
├─────────────────────────────────────────────────────────────┤
│  CopilotKitProvider  │  EnhancedAGUIChat                   │
│  - Token management   │  - SSE connection                   │
│  - Header injection   │  - Message handling                 │
│  - Dev console        │  - Event display                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
├─────────────────────────────────────────────────────────────┤
│  CopilotKit Router    │  AG-UI Router                       │
│  /api/copilotkit      │  /ai/events (SSE)                   │
│  - Streaming chat     │  /ai/message (POST)                 │
│  - Action handling    │  - Pydantic validation              │
│                       │  - RebelzAgent integration          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Pydantic Models                          │
├─────────────────────────────────────────────────────────────┤
│  AGUIMessage  │  AGUIEvent  │  AGUIMessageRequest           │
│  - Type safety                                              │
│  - Validation                                               │
│  - Serialization                                            │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### CopilotKit Features

- ✅ **Natural Language Actions** - "Create a workshop", "Find events", etc.
- ✅ **Streaming Responses** - Real-time chat experience
- ✅ **Context Awareness** - Knows about user data and system state
- ✅ **Action Handlers** - Direct API integration
- ✅ **Development Console** - Debug mode for developers

### AG-UI Features

- ✅ **Server-Sent Events** - Real-time bidirectional communication
- ✅ **Pydantic Validation** - Type-safe API requests/responses
- ✅ **Structured Responses** - Events, text, errors with proper typing
- ✅ **Automatic Reconnection** - Resilient connection handling
- ✅ **Event Cards** - Rich UI for structured data

## 🎬 Demo

### Creating an Event

```
User: "Create a basketball workshop for next Friday at 3pm"

CopilotKit:
  1. Parses natural language
  2. Calls createEvent action
  3. Makes API request to /api/events
  4. Returns confirmation

Response: "Successfully created event 'Basketball Workshop' with ID 42"
```

### Viewing Events

```
User: "Show me my upcoming events"

AG-UI:
  1. Sends message to /ai/message
  2. RebelzAgent queries database
  3. Returns structured event data
  4. Displays AGUIEventCard components

Response: [Event cards showing 3 upcoming events]
```

## 🔧 API Endpoints

### CopilotKit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/copilotkit` | SSE connection |
| POST | `/api/copilotkit` | Chat & actions (streaming) |

### AG-UI

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ai/events` | SSE with heartbeat |
| POST | `/ai/message` | Message processing |
| POST | `/ai/chat` | Traditional chat |
| GET | `/ai/suggestions` | Personalized suggestions |
| GET | `/ai/help/topics` | Help topics |

## 📝 Example Usage

### Backend: Create AG-UI Endpoint

```python
from app.schemas.agui import AGUIMessageRequest, AGUIMessageResponse

@router.post("/my-endpoint", response_model=AGUIMessageResponse)
async def my_endpoint(
    request: AGUIMessageRequest,
    current_user: User = Depends(get_current_user)
) -> AGUIMessageResponse:
    # Process with Pydantic validation
    content = request.data.content
    
    # Your logic here
    result = process(content)
    
    # Return typed response
    return AGUIMessageResponse(
        type="message",
        data={"role": "assistant", "content": result}
    )
```

### Frontend: Use CopilotKit Action

```typescript
useCopilotAction({
  name: "myAction",
  description: "What this action does",
  parameters: [
    {
      name: "param",
      type: "string",
      description: "Parameter description",
      required: true
    }
  ],
  handler: async ({ param }) => {
    const response = await fetch('/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify({ param })
    });
    return await response.json();
  }
});
```

## 🧪 Testing

### Run Automated Tests

```bash
python scripts/test_copilotkit_agui.py
```

This tests:
- ✅ Health endpoint
- ✅ CopilotKit actions
- ✅ CopilotKit chat (streaming)
- ✅ AG-UI message endpoint
- ✅ AG-UI SSE connection
- ✅ Pydantic validation

### Manual Testing

1. Start backend: `uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser: `http://localhost:5173/chat`
4. Enable AG-UI and CopilotKit toggles
5. Try example commands

## 🐛 Troubleshooting

### CopilotKit not working?

```bash
# Check endpoint
curl http://localhost:8000/api/copilotkit

# Check browser console
# Look for CORS or authentication errors
```

### AG-UI SSE not connecting?

```bash
# Test SSE endpoint
curl -N http://localhost:8000/ai/events

# Check browser Network tab
# Look for EventStream connection
```

### Validation errors?

```python
# Verify request format
{
  "type": "message",
  "data": {
    "role": "user",
    "content": "text"
  }
}
```

## 📦 Files Changed

### Backend
- ✅ `app/schemas/agui.py` - NEW Pydantic models
- ✅ `app/api/routers/copilotkit.py` - Rewritten with streaming
- ✅ `app/api/routers/ai.py` - Updated with Pydantic

### Frontend
- ✅ `frontend/src/components/CopilotKitProvider.tsx` - Enhanced
- ✅ `frontend/src/components/EnhancedAGUIChat.tsx` - Rewritten

### Documentation
- ✅ `docs/COPILOTKIT_AGUI_INTEGRATION.md` - Full guide
- ✅ `docs/INTEGRATION_SUMMARY.md` - Summary
- ✅ `docs/QUICK_REFERENCE_COPILOTKIT_AGUI.md` - Cheat sheet
- ✅ `docs/MIGRATION_GUIDE_COPILOTKIT_AGUI.md` - Migration guide
- ✅ `scripts/test_copilotkit_agui.py` - Test script

## 🎓 Learn More

- **CopilotKit:** [docs.copilotkit.ai](https://docs.copilotkit.ai/)
- **Pydantic:** [docs.pydantic.dev](https://docs.pydantic.dev/)
- **FastAPI SSE:** [fastapi.tiangolo.com](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
- **Server-Sent Events:** [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 🤝 Contributing

Want to add more features?

1. Add new Pydantic models in `app/schemas/agui.py`
2. Create new endpoints in routers
3. Add CopilotKit actions in frontend
4. Update documentation
5. Add tests

## 📄 License

Same as the main Rebelz application.

## 🙏 Acknowledgments

- **CopilotKit** - For the amazing AI copilot framework
- **Pydantic** - For type-safe data validation
- **FastAPI** - For the excellent web framework
- **React** - For the frontend framework

---

**Ready to use!** 🎉

The integration is complete and production-ready. Check the [Integration Guide](docs/COPILOTKIT_AGUI_INTEGRATION.md) for detailed documentation.

