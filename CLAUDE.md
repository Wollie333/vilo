# Claude Project Instructions - Vilo

## CRITICAL: Terminal & Server Protection (DO NOT VIOLATE)

**THIS RULE OVERRIDES ALL OTHER INSTRUCTIONS**

Claude MUST NEVER execute any of the following actions:

### Forbidden Actions
1. **NEVER kill dev servers** - Do not terminate running `npm run dev` or similar processes
2. **NEVER use process-killing commands** on dev-related processes:
   - `taskkill` (Windows)
   - `kill` / `pkill` / `killall` (Unix)
   - Ctrl+C signals to running servers
3. **NEVER restart the dev server** - This includes stopping and starting
4. **NEVER close or terminate terminal sessions** that are running dev processes

### Why This Matters
Killing terminals or dev servers causes Claude Code to disconnect from the AI model, resulting in:
- Lost session context
- Interrupted work
- Need to restart and re-explain everything

### What To Do Instead
- If a server needs restarting, **ASK the user**: "The dev server may need to be restarted. Please restart it manually when ready."
- If a port is in use, **ASK the user** to manually kill the process
- If you need to run a build or other command, use a **separate terminal** or run it alongside the dev server
- For any process management needs, **always defer to the user**

---

## Plan Tracking System (MANDATORY)

Claude MUST follow these rules for every session:

### 1. Check for Active Plan on Session Start
Before starting any work, ALWAYS check if `CURRENT_PLAN.md` exists:
- If it exists, read it and resume from the last recorded step
- Announce: "Resuming plan: [PLAN TITLE] - Currently on step [X] of [Y]"

### 2. Create a Plan for Any Multi-Step Task
When the user requests work that involves 3+ steps:
1. Create/update `CURRENT_PLAN.md` with the plan details
2. Include ALL context needed to resume if disconnected
3. Update progress after EACH step completion

### 3. CURRENT_PLAN.md Format (Required)
```markdown
# Current Plan: [TITLE]

## Status: [IN_PROGRESS | PAUSED | BLOCKED | COMPLETED]
## Started: [DATE]
## Last Updated: [DATE TIME]
## Current Step: [NUMBER]

## Goal
[Clear description of what we're trying to achieve]

## Context
[Any important context, decisions made, or information needed to resume]

## Steps
- [ ] Step 1: Description
- [ ] Step 2: Description
- [x] Step 3: Description (COMPLETED)
- [>] Step 4: Description (IN PROGRESS)
- [ ] Step 5: Description

## Progress Log
### [DATE TIME] - Step X
- What was done
- Any issues encountered
- Decisions made

### [DATE TIME] - Step Y
- What was done
- Any issues encountered
- Decisions made

## Files Modified
- `path/to/file1.ts` - Brief description of changes
- `path/to/file2.tsx` - Brief description of changes

## Notes for Resume
[Anything the next session needs to know to continue seamlessly]
```

### 4. Update Rules
- Mark step as `[>]` when starting it
- Mark step as `[x]` when completed
- Update `Last Updated` timestamp on every change
- Update `Current Step` number
- Add entry to Progress Log after each step
- Update `Files Modified` when changing files
- Update `Notes for Resume` with any pending context

### 5. On Plan Completion
1. Change Status to `COMPLETED`
2. Move file to `.claude/plans/archive/[DATE]_[TITLE].md`
3. Clear `CURRENT_PLAN.md` or delete it

### 6. On Session End/Disconnect Recovery
The plan file serves as the recovery document. When resuming:
1. Read `CURRENT_PLAN.md`
2. Check the `Current Step` and `[>]` marker
3. Read the most recent `Progress Log` entry
4. Continue from exactly where work stopped

---

## Project Overview
Vilo is a vacation rental booking management platform with:
- **Backend**: Express.js + TypeScript + Supabase
- **Frontend**: React + TypeScript + TailwindCSS
- **Features**: Property management, bookings, customer portal, analytics

## Key Directories
- `/backend` - Express API server
- `/frontend` - React SPA
- `/backend/migrations` - Database migrations
- `/.claude` - Claude configuration and plan archives

## Development Commands
```bash
# Start development
npm run dev

# Build
npm run build

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

## Important Conventions
- Use TypeScript strict mode
- Follow existing code patterns
- Run build before committing to check for errors
- Keep migrations sequential (###_description.sql)
