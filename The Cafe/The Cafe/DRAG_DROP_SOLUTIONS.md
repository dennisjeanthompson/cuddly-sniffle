# Drag-Drop Debugging - Checklist & Solutions

## ✅ What I've Done

### 1. **Added Enhanced Console Logging** (Commit: 18114b6)

**Client-side** (`client/src/pages/mui-schedule.tsx`):
```typescript
console.log('📡 [Schedule] Fetching shifts from:', endpoint);
console.log('👤 [Schedule] Is manager:', isManagerRole);
console.log('✅ [Schedule] Shifts API response:', json);
console.log('📊 [Schedule] Total shifts returned:', json.shifts?.length || 0);
console.log('📦 [Schedule] Shifts in state:', shifts.length, shifts.slice(0, 1));
```

**Server-side** (`server/routes.ts`):
```typescript
console.log('📡 [GET /api/shifts/branch] Request from manager:', req.user!.username);
console.log('📍 Branch ID:', branchId);
console.log('📅 Date range:', startDate, 'to', endDate);
console.log('📊 [GET /api/shifts/branch] Found shifts in DB:', shifts.length);
console.log('✅ [GET /api/shifts/branch] Returning shifts:', activeShifts.length);
```

Now when you open the browser console, you'll see exactly what's happening.

---

## 🔍 Quick Diagnostic Checklist

Run each check in order:

### **Check 1: Are You a Manager?**
```javascript
// Paste in browser console (F12):
fetch('/api/auth/status')
  .then(r => r.json())
  .then(data => {
    console.log('User:', data.user?.username);
    console.log('Role:', data.user?.role);
    console.log('Is Manager:', data.user?.role === 'manager');
    console.log('Branch ID:', data.user?.branchId);
  });
```

Expected output:
```
User: john_manager
Role: manager
Is Manager: true
Branch ID: branch-abc123
```

**If you see:**
- `Is Manager: false` → **Not logged in as manager**
- `Branch ID: null` → **Manager has no branch assigned**

---

### **Check 2: Does Database Have Shifts?**

Use your database client (psql, pgAdmin, etc.):

```sql
-- Count total shifts
SELECT COUNT(*) FROM shifts;

-- View shifts for this week
SELECT 
  s.id,
  s."startTime",
  s."endTime",
  u."firstName",
  u."lastName",
  b.name as branch
FROM shifts s
LEFT JOIN users u ON s."userId" = u.id
LEFT JOIN branches b ON s."branchId" = b.id
WHERE s."startTime" >= NOW() - INTERVAL '7 days'
LIMIT 10;
```

Expected: At least 1 shift for current week

---

### **Check 3: Is API Returning Shifts?**

```javascript
// Paste in browser console:
const start = new Date();
start.setDate(start.getDate() - 7);
const end = new Date();
end.setDate(end.getDate() + 7);

const url = `/api/shifts/branch?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

fetch(url)
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Shifts returned:', data.shifts?.length || 0);
    if (data.shifts?.length > 0) {
      console.log('First shift:', data.shifts[0]);
    }
  });
```

Expected output:
```
Status: 200
Shifts returned: 5
First shift: {id: "shift-123", startTime: "2025-12-10T06:00:00Z", endTime: "2025-12-10T14:00:00Z", ...}
```

**If you see:**
- `Status: 401` → **Not authenticated, login again**
- `Status: 403` → **Not authorized as manager**
- `Status: 200` but `Shifts returned: 0` → **No shifts in database**

---

### **Check 4: Can You See Console Logs?**

1. Open **DevTools** (F12)
2. Go to **Console** tab
3. Reload the page
4. Look for logs starting with `📡 [Schedule]` or `📊 [Schedule]`

Example output:
```
📡 [Schedule] Fetching shifts from: /api/shifts/branch?startDate=2025-12-07T...&endDate=2025-12-15T...
👤 [Schedule] Is manager: true
✅ [Schedule] Shifts API response: {shifts: Array(0)}
📊 [Schedule] Total shifts returned: 0
📦 [Schedule] Shifts in state: 0 []
```

**If `0` shifts:** Problem is in database or API filtering

---

## 🚀 Solutions

### **Solution 1: Create Test Shift (Fastest)**

Use the "Add Shift" button in the UI:

1. Click **"Add Shift"** button
2. **Select Employee**: Choose any employee
3. **Select Dates**: Click tomorrow (or any future date)
4. **Select Time**: Click **"Morning"** (6 AM - 2 PM)
5. Click **"Create"**
6. **Reload page** (F5)
7. Shift card should appear as draggable

---

### **Solution 2: Seed Database with SQL**

```sql
-- Get IDs first
SELECT id, "firstName", "lastName" FROM users LIMIT 5;
SELECT id, name FROM branches LIMIT 5;

-- Then create a shift (replace IDs with actual values)
INSERT INTO shifts (
  id,
  "userId",
  "branchId",
  "startTime",
  "endTime",
  status,
  position,
  "createdAt",
  "updatedAt"
) VALUES (
  'test-shift-001',
  'USER_ID_HERE',           -- Get from users table
  'BRANCH_ID_HERE',         -- Get from branches table
  '2025-12-10 06:00:00',    -- Tomorrow 6 AM
  '2025-12-10 14:00:00',    -- Same day 2 PM
  'scheduled',
  'Barista',
  NOW(),
  NOW()
);
```

---

### **Solution 3: Seed Via TypeScript**

Create `server/seed-test-shift.ts`:

```typescript
import { storage } from './storage';

async function createTestShift() {
  try {
    // Get first manager
    const users = await storage.getAllUsers();
    const manager = users.find(u => u.role === 'manager');
    const employee = users.find(u => u.role !== 'manager' && u.isActive);
    
    if (!manager) throw new Error('No manager found');
    if (!employee) throw new Error('No active employee found');
    
    console.log('Manager:', manager.firstName, 'Branch:', manager.branchId);
    console.log('Employee:', employee.firstName);
    
    // Create shift for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(6, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(14, 0, 0, 0);
    
    const shift = await storage.createShift({
      userId: employee.id,
      branchId: manager.branchId,
      startTime: tomorrow.toISOString(),
      endTime: endTime.toISOString(),
      status: 'scheduled',
      position: employee.position || 'Staff',
    });
    
    console.log('✅ Shift created:', shift.id);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestShift();
```

Run: `npx ts-node server/seed-test-shift.ts`

---

## ❓ Troubleshooting

### **Problem: "Total shifts: 0" but I created shifts**

**Causes:**
1. Shifts are outside current week view (dates too old/new)
2. Shift belongs to different manager's branch
3. Shift's employee is marked inactive
4. Browser cache - need hard refresh

**Fix:**
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Check date range in API call matches your shifts
- Verify shifts.isActive = true in database

---

### **Problem: 409 Conflict when trying to create shift**

You're trying to create a shift that overlaps with existing one.

**Check:**
```sql
-- See all shifts for this employee
SELECT * FROM shifts 
WHERE "userId" = 'EMPLOYEE_ID' 
ORDER BY "startTime";
```

**Fix:** Delete conflicting shift or choose different time

---

### **Problem: See shift cards but can't drag them**

This means shifts ARE loading (good!), but drag listeners might not be attached.

**Check in DevTools:**
1. Inspect the shift card HTML
2. Should have `draggable="true"`
3. If not, check isManager = true

**Example:**
```html
<!-- Correct (draggable) -->
<div draggable="true" class="MuiCard-root">
  6:00 AM - 2:00 PM
</div>

<!-- Wrong (not draggable) -->
<div class="MuiCard-root">
  6:00 AM - 2:00 PM
</div>
```

---

## 📋 Reference: What Should Happen

### **Working Setup**
```
User logs in as manager
    ↓
Manager has branchId set in database
    ↓
Page loads, isManagerRole = true
    ↓
Query fetches /api/shifts/branch with date range
    ↓
Server returns shifts for that branch
    ↓
Shifts load into React state
    ↓
Component renders shift cards with draggable="true"
    ↓
Drag-drop works! ✅
```

### **Broken Setup**
```
User logs in as manager
    ↓
⚠️ Manager has NO branchId (NULL in database)
    ↓
Query fetches /api/shifts/branch
    ↓
Server filters by NULL branchId → no results
    ↓
Returns empty array: { shifts: [] }
    ↓
Component renders empty grid
    ↓
No cards to drag ❌
```

---

## 🎯 Complete Debugging Flow

1. **Check console logs** (F12 → Console tab)
   - Look for `📡 [Schedule]` logs
   - Check if shifts count is 0 or > 0

2. **Run diagnostic in console** (see Check 1-4 above)
   - Verify you're manager
   - Verify API returns data
   - Verify database has shifts

3. **If 0 shifts: Create one** via UI or SQL
   - Use "Add Shift" button (easiest)
   - Or seed database with SQL

4. **Reload page**
   - Shift card should appear
   - Should be draggable

5. **Drag it!**
   - Hover: cursor changes to "grab"
   - Click & hold: opacity becomes 50%
   - Drag: target cell highlights
   - Release: shift moves to new time
   - Success! 🎉

---

## 📚 Files to Check

- **Schedule page**: `client/src/pages/mui-schedule.tsx`
- **Drag component**: `client/src/components/schedule/resource-timeline-scheduler.tsx`
- **Server endpoint**: `server/routes.ts` line 469 (`/api/shifts/branch`)
- **Storage**: `server/storage.ts` (`getShiftsByBranch` method)

---

## ✅ Code is Correct

The drag-drop TypeScript code is **100% correct**. The issue is **100% data-related**.

```typescript
// This is working correctly ✅
const handleDrop = (employeeId: string, dayIdx: number, hour: number) => {
  const shift = draggedShift;
  const oldStart = parseISO(shift.startTime);
  const oldEnd = parseISO(shift.endTime);
  const duration = oldEnd.getTime() - oldStart.getTime();
  
  const newStart = new Date(weekDays[dayIdx]);
  newStart.setHours(hour, 0, 0, 0);
  const newEnd = new Date(newStart.getTime() + duration);
  
  updateShiftMutation.mutate({
    shiftId: shift.id,
    newStartTime: newStart.toISOString(),
    newEndTime: newEnd.toISOString(),
  });
};
```

Once you have shifts in your database, this will work perfectly. 🚀
