# 🎯 DRAG-DROP LIVE DEBUGGING GUIDE

## What Changed
I've added comprehensive console logging to the drag-drop system to trace exactly where it breaks. The logging happens at every step of the drag-drop process.

## How to Test

### Step 1: Open Browser DevTools
1. Go to the app
2. Press **F12** to open DevTools
3. Click the **Console** tab
4. Clear any existing logs with **Ctrl+L**

### Step 2: Try to Drag a Shift Card

The console will show logs in this sequence. Each emoji indicates a stage:

```
🎯 [Drag Start]      ← Shift is being picked up
📍 [Drag Over]       ← Mouse moving over drop zones
🎪 [Drop]            ← Mouse released on drop zone
🔄 [Mutation]        ← API request being sent
📨 [Mutation]        ← API response received
✅ [Mutation]        ← Database update succeeded
🎉 [Mutation]        ← Queries refreshed
```

---

## Expected Behavior (What Should Happen)

### A. Drag Start
When you click and hold on a shift card:
```
🎯 [Drag Start] Shift: shift-123 Employee: emp-456 {id: "shift-123", ...}
✅ [Drag Start] Set drag source: {employeeId: "emp-456", hour: 9}
```

**If you see ❌ instead:**
- `❌ [Drag] Not a manager, drag disabled` = You're not logged in as a manager
- Nothing appears = The shift card isn't rendering properly

---

### B. Drag Over
While you drag the card over drop zones:
```
📍 [Drag Over] Position: {x: 450, y: 320}
📍 [Drag Over] dataTransfer.effectAllowed: move
✅ [Drag Over] dropEffect set to "move"
```

This should appear **multiple times** as you move the mouse. If it doesn't:
- Drop zone isn't accepting drags
- Mouse pointer should change to "copy" icon

---

### C. Drop (Critical)
When you release the mouse:
```
🎯 [Drop Handler] Drop event fired
📏 [Drop Handler] Drop Y: 150 Cell Height: 200
⏰ [Drop Handler] Calculated hour: 10
🎪 [Drop] Attempting drop on employee: emp-456 day: 2 hour: 10
🎪 [Drop] draggedShift: shift-123 dragSource: {employeeId: "emp-456", hour: 9} isManager: true
⏱️ [Drop] Duration: 480 minutes
📅 [Drop] New times: 2025-12-11T10:00:00.000Z - 2025-12-11T18:00:00.000Z
🚀 [Drop] Mutation sent for shift: shift-123
```

**If you see ❌ instead:**
- `❌ [Drop] No draggedShift, aborting` = Shift wasn't captured on drag start
- `❌ [Drop] No dragSource, aborting` = Drag source wasn't recorded
- `❌ [Drop] Not a manager, aborting` = Authorization issue
- `❌ [Drop] Shift exceeds day boundary` = Shift duration too long for target time

---

### D. Mutation (Server Call)
After drop, check server logs:
```
🔄 [Mutation] Sending PUT to /api/shifts/shift-123 {
  startTime: "2025-12-11T10:00:00.000Z",
  endTime: "2025-12-11T18:00:00.000Z"
}
📨 [Mutation] Response status: 200
✅ [Mutation] Success response: {shift: {...}}
🎉 [Mutation] onSuccess - Invalidating queries
```

**If you see errors:**
```
❌ [Mutation] Response status: 409
❌ [Mutation] Error response: {
  message: "Employee already has a shift scheduled...",
  code: "SHIFT_CONFLICT"
}
```

This means the new time overlaps with another shift.

---

## Common Issues & Solutions

### Issue 1: Nothing Logs When Dragging
**Symptom:** No logs appear at all
**Causes:**
1. Not a manager (can't drag)
2. No shifts in database (nothing to drag)
3. JavaScript error preventing drag handlers from running

**Solution:**
- Check if logged in as manager: `console.log(getCurrentUser())`
- Check if shifts exist: Look for `📦 [Schedule] Shifts in state:` logs
- Check for errors in console (red text)

### Issue 2: Drop Logs Show But No Mutation Logs
**Symptom:** 
```
🎪 [Drop] Attempting drop...  ✅
🚀 [Drop] Mutation sent...     ✅
❌ [Mutation] No logs         ✗
```
**Cause:** Mutation isn't being triggered properly
**Solution:**
- Check `updateShiftMutation.isPending` state
- Verify the mutation function is defined
- Look for network errors in Network tab (F12 → Network)

### Issue 3: Server Logs Show Error
**Symptom:**
```
❌ [PUT /api/shifts/:id] Error: Cannot read property 'startTime'
```
**Cause:** Invalid data being sent from frontend
**Solution:**
- Verify the times are valid ISO strings
- Check `updateData` parsing: `insertShiftSchema.partial().parse(req.body)`
- Make sure `startTime` and `endTime` are in the request body

### Issue 4: Drop Handler Doesn't Fire
**Symptom:** You can drag the card, but releasing it doesn't trigger drop
**Symptom logs:**
```
🎯 [Drag Start] ...     ✅
📍 [Drag Over] ...      ✅
❌ [Drop Handler] Not logged
```
**Cause:** Drop zone box isn't accepting drops
**Solutions:**
1. Make sure `onDragOver` has `e.preventDefault()` ✅ (I fixed this)
2. Check if drop zone has `pointerEvents: "none"` style
3. Ensure drop zone has reasonable height (minHeight: "100px")

---

## Debug Commands for Console

Paste these in the browser console to help debug:

### 1. Check if Manager
```javascript
// In browser console
console.log('🔐 Current user:', JSON.parse(localStorage.getItem('user')));
```

### 2. Check Shifts in State
```javascript
// This won't work directly, but you can look for:
// 📦 [Schedule] Shifts in state: X
// logs to see if shifts are loaded
```

### 3. Trigger Manual Mutation (Advanced)
```javascript
// If mutation isn't firing, you can see the issue:
// 1. Open Network tab (F12 → Network)
// 2. Try to drag-drop
// 3. Look for PUT request to /api/shifts/...
// 4. Check Response tab to see server error
```

### 4. Check Browser Drag API Support
```javascript
// Verify drag-drop works in browser
console.log('Drag-drop supported:', 'draggable' in document.createElement('div'));
```

---

## Server-Side Debugging

If client logs look good but server doesn't respond, check server logs:

### 1. Check Server is Running
```bash
# Terminal
cd "/workspaces/urban-barnacle/cuddly-sniffle/The Cafe/The Cafe"
npm run dev
```

### 2. Watch for Logs
Server logs will show:
```
🔧 [PUT /api/shifts/:id] Request for shift: abc123
🔧 [PUT /api/shifts/:id] Body: {startTime: "...", endTime: "..."}
✅ [PUT /api/shifts/:id] Parsed data: {...}
📍 [PUT /api/shifts/:id] Found existing shift: {...}
✅ [PUT /api/shifts/:id] Updated shift: {...}
```

---

## Step-by-Step Troubleshooting

### 1. Start Here
- [ ] Open DevTools Console
- [ ] Check for red errors
- [ ] Look for `📦 [Schedule] Shifts in state: X`
  - If X = 0, no shifts exist in database
  - If X > 0, shifts are loaded

### 2. Try Drag
- [ ] Click and hold on a shift card
- [ ] Look for `🎯 [Drag Start]` log
  - If ❌ appears, drag isn't working (check isManager)
  - If ✅ appears, drag is working

### 3. Try Drag Over
- [ ] While holding, move mouse over empty drop zones
- [ ] Look for `📍 [Drag Over]` logs
  - Should appear multiple times
  - If not, drop zone isn't registered

### 4. Try Drop
- [ ] Release mouse over a drop zone
- [ ] Look for `🎪 [Drop]` logs
  - If ❌, something prevented the drop
  - If ✅, mutation should fire

### 5. Check Mutation
- [ ] Look for `🔄 [Mutation]` logs
  - If no logs, mutation didn't execute
  - If logs appear, check response status

---

## Commit Info

**Commit:** `5182cb2` - Add comprehensive drag-drop debugging and logging

**Files Modified:**
1. `client/src/components/schedule/resource-timeline-scheduler.tsx`
   - Added logs to handleDragStart
   - Added logs to handleDragOver
   - Added logs to handleDrop
   - Added logs to mutation function
   - Added e.preventDefault() and e.stopPropagation() to drop handler

2. `server/routes.ts`
   - Added logs to PUT /api/shifts/:id endpoint
   - Logs show request, parsing, validation, and response

---

## Next Steps

1. **Do the test above** and paste the console logs here
2. **Show me which logs appear** and which ones don't
3. **Show me any red errors** in the console
4. I'll tell you exactly what's broken

This is the fastest way to fix it!

---

## Quick Reference: Log Meanings

| Log | Meaning | Status |
|-----|---------|--------|
| 🎯 [Drag Start] | Shift card grabbed | Good, drag working |
| ❌ [Drag] Not a manager | User not authorized | Fix: Login as manager |
| 📍 [Drag Over] | Mouse moving over zone | Good, zone accepting |
| 🎪 [Drop] Attempting | Drop triggered | Good, should succeed |
| ❌ [Drop] No draggedShift | Drag didn't register | Fix: Start drag again |
| 🔄 [Mutation] Sending | API call starting | Good, sending to server |
| 📨 [Mutation] Response status: 200 | Success | Good ✅ |
| 📨 [Mutation] Response status: 409 | Conflict (overlap) | Expected if times overlap |
| ✅ [Mutation] Success | Data saved | Good ✅ |
| 🎉 [Mutation] onSuccess | UI updated | Good ✅ |

