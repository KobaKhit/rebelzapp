# Nginx Configuration Consolidation

## Current Situation (Not Ideal)

You currently have **two nginx configurations**:

1. **`frontend/nginx.conf`** (225 lines)
   - Detailed security rules
   - Rate limiting
   - Honeypots for attackers
   - Proper API routing
   - **NOT BEING USED** in production

2. **`Dockerfile` inline config** (60 lines)
   - Simple configuration
   - Missing security features
   - Missing SSE support (just fixed)
   - **CURRENTLY USED** in production

## Problem

This creates several issues:

1. **Confusion** - Which config is actually used?
2. **Maintenance** - Need to update two places
3. **Security** - Production missing security features from `frontend/nginx.conf`
4. **Inconsistency** - Dev and prod configs differ

## Recommended Solution

### Option 1: Use the Detailed nginx.conf (RECOMMENDED)

**Pros:**
- Better security features
- Rate limiting
- Attack prevention
- Easier to maintain

**Cons:**
- Need to update it for SSE support

**Implementation:**

1. Update `frontend/nginx.conf` with SSE support
2. Copy it in Dockerfile instead of inline config
3. Delete inline config from Dockerfile

### Option 2: Keep Inline Config

**Pros:**
- Everything in one file (Dockerfile)
- Simpler for basic deployments

**Cons:**
- Missing security features
- Harder to test nginx config separately
- Dockerfile becomes cluttered

### Option 3: External Config File (BEST PRACTICE)

**Pros:**
- Separation of concerns
- Easy to test and modify
- Can use same config for dev and prod
- Professional approach

**Cons:**
- One more file to manage

## Implementation Plan

I'll implement **Option 3** - Create a production-ready nginx config that:
- Combines security features from `frontend/nginx.conf`
- Adds SSE support for AG-UI
- Works for production deployment
- Can be used in both Docker and standalone nginx

Would you like me to:
1. Create a consolidated `nginx.prod.conf` file
2. Update Dockerfile to use it
3. Keep `frontend/nginx.conf` for local dev (if needed)
4. Document the difference between dev and prod configs

