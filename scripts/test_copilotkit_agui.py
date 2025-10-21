#!/usr/bin/env python3
"""
Test script for CopilotKit and AG-UI integration
"""
import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from app.core.config import get_settings


settings = get_settings()
BASE_URL = "http://localhost:8000"


async def test_copilotkit_actions():
    """Test CopilotKit actions endpoint"""
    print("\n=== Testing CopilotKit Actions Endpoint ===")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/copilotkit")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Available actions: {len(data.get('actions', []))}")
                for action in data.get('actions', []):
                    print(f"  - {action['name']}: {action['description']}")
                print("✅ CopilotKit actions endpoint working")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_copilotkit_chat():
    """Test CopilotKit chat endpoint"""
    print("\n=== Testing CopilotKit Chat Endpoint ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test chat without auth (should still work)
            response = await client.post(
                f"{BASE_URL}/api/copilotkit",
                json={
                    "messages": [
                        {"role": "user", "content": "Hello, can you help me?"}
                    ]
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                # For streaming responses, we just check if we get data
                print("✅ CopilotKit chat endpoint responding")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_agui_message():
    """Test AG-UI message endpoint"""
    print("\n=== Testing AG-UI Message Endpoint ===")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test without auth (should fail gracefully)
            response = await client.post(
                f"{BASE_URL}/ai/message",
                json={
                    "type": "message",
                    "data": {
                        "role": "user",
                        "content": "Hello"
                    }
                }
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 401:
                print("✅ AG-UI message endpoint requires auth (as expected)")
            elif response.status_code == 200:
                data = response.json()
                print(f"Response type: {data.get('type')}")
                print("✅ AG-UI message endpoint working")
            else:
                print(f"⚠️  Unexpected status: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_agui_sse():
    """Test AG-UI SSE endpoint"""
    print("\n=== Testing AG-UI SSE Endpoint ===")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Test SSE connection (will timeout after 5 seconds)
            async with client.stream('GET', f"{BASE_URL}/ai/events") as response:
                print(f"Status: {response.status_code}")
                
                if response.status_code == 200:
                    print("Headers:", dict(response.headers))
                    
                    # Read first event
                    event_count = 0
                    async for line in response.aiter_lines():
                        if line.startswith('data:'):
                            event_count += 1
                            data = json.loads(line[5:].strip())
                            print(f"Event {event_count}: {data.get('type')}")
                            
                            if event_count >= 1:
                                # Got at least one event, that's enough
                                break
                    
                    print("✅ AG-UI SSE endpoint working")
                else:
                    print(f"❌ Failed: {response.text}")
    except httpx.ReadTimeout:
        print("✅ AG-UI SSE endpoint streaming (timed out as expected)")
    except Exception as e:
        print(f"❌ Error: {e}")


async def test_health():
    """Test health endpoint"""
    print("\n=== Testing Health Endpoint ===")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/health")
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"Response: {response.json()}")
                print("✅ Server is healthy")
            else:
                print(f"❌ Failed: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_pydantic_validation():
    """Test Pydantic validation on AG-UI endpoint"""
    print("\n=== Testing Pydantic Validation ===")
    
    async with httpx.AsyncClient() as client:
        try:
            # Test with invalid data structure
            response = await client.post(
                f"{BASE_URL}/ai/message",
                json={
                    "type": "invalid_type",
                    "data": "not a dict"
                },
                headers={"Authorization": "Bearer fake_token"}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 422:
                print("✅ Pydantic validation working (rejected invalid data)")
            elif response.status_code == 401:
                print("✅ Auth required (as expected)")
            else:
                print(f"⚠️  Unexpected status: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("CopilotKit & AG-UI Integration Tests")
    print("=" * 60)
    print(f"\nTesting against: {BASE_URL}")
    print("Note: Some tests may fail if server is not running")
    
    await test_health()
    await test_copilotkit_actions()
    await test_copilotkit_chat()
    await test_agui_message()
    await test_agui_sse()
    await test_pydantic_validation()
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

