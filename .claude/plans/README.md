# Claude Plan Tracking System

## Overview
This system ensures Claude can resume work seamlessly after disconnections or session interruptions by maintaining persistent plan documentation.

## How It Works

### Active Plan
- **Location**: `/CURRENT_PLAN.md` (project root)
- Contains the current task being worked on
- Updated after every step completion
- Includes all context needed to resume

### Plan Template
- **Location**: `/.claude/plans/PLAN_TEMPLATE.md`
- Copy this when starting a new plan
- Contains all required sections and formatting

### Plan Archive
- **Location**: `/.claude/plans/archive/`
- Completed plans are moved here
- Naming format: `YYYY-MM-DD_plan-title.md`

## Session Workflow

### Starting a Session
1. Check if `/CURRENT_PLAN.md` exists
2. If yes: Read it and announce current progress
3. If no: Wait for user task or create new plan

### During Work
1. Update `[>]` marker to current step
2. Update `Last Updated` timestamp
3. Add Progress Log entry after each step
4. Update Files Modified section
5. Update Notes for Resume frequently

### On Task Completion
1. Mark all steps as `[x]` or `[-]`
2. Change Status to `COMPLETED`
3. Move file to archive with date prefix
4. Delete or clear `/CURRENT_PLAN.md`

### On Disconnection Recovery
1. Read `/CURRENT_PLAN.md`
2. Find step marked with `[>]`
3. Read latest Progress Log entry
4. Read Notes for Resume section
5. Continue from that exact point

## Quick Commands

```bash
# Check for active plan
cat CURRENT_PLAN.md

# View archived plans
ls -la .claude/plans/archive/

# View plan template
cat .claude/plans/PLAN_TEMPLATE.md
```

## Integration with Git
- CURRENT_PLAN.md is tracked in git
- Provides additional recovery through git history
- Commit progress at logical checkpoints
