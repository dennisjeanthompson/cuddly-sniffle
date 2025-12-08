/**
 * ENHANCED DRAG-AND-DROP SCHEDULER - USAGE GUIDE FOR MANAGERS
 * 
 * This document explains how managers/admins can assign and edit shifts
 * using the modern drag-and-drop interface.
 */

// ============================================================================
// HOW MANAGERS ASSIGN SHIFTS
// ============================================================================

/**
 * METHOD 1: Using the "Add Shift" Button (TOP RIGHT)
 * ───────────────────────────────────────────────────
 * 
 * Best for: Creating shifts quickly with specific times
 * 
 * Steps:
 * 1. Click "Add Shift" button in top-right
 * 2. Select an employee from dropdown
 * 3. Click on desired date in the week grid
 * 4. Choose shift time:
 *    - Morning (6 AM - 2 PM)
 *    - Afternoon (2 PM - 10 PM)
 *    - Night (10 PM - 6 AM)
 *    - OR set custom times
 * 5. Add optional notes
 * 6. Click "Create Shift"
 * 
 * Result: Shift appears on the calendar immediately
 */

// ============================================================================
// HOW MANAGERS EDIT SHIFTS
// ============================================================================

/**
 * METHOD 1: Drag to Change Time (MOVE SHIFT)
 * ──────────────────────────────────────────
 * 
 * Best for: Moving a shift to a different time or day
 * 
 * How it works:
 * 1. Manager hovers over shift card → cursor changes to "grab"
 * 2. Left-click and HOLD down on the shift
 * 3. Drag the shift to a NEW TIME SLOT
 * 4. Mouse cursor changes to "grabbing"
 * 5. Drop on the new time/day
 * 6. Shift AUTOMATICALLY updates with new time
 * 7. API call happens in background
 * 8. Calendar refreshes to show new position
 * 
 * Features:
 * ✓ Preserves shift duration (stays 8 hours if originally 8 hours)
 * ✓ Validates no overlaps
 * ✓ Works across different days
 * ✓ Instant visual feedback
 * ✓ Real-time sync with backend
 * 
 * Example:
 * ┌─────────────────────────────────────┐
 * │ Monday 6 AM │ Sam: 6-2 PM           │  ← Grab here
 * │             │ [===DRAG===]           │
 * │             ↓                        │
 * │ Tuesday 2 PM │ Sam: 2-10 PM          │  ← Drop here
 * └─────────────────────────────────────┘
 */

/**
 * METHOD 2: Delete and Re-Create (FOR MAJOR CHANGES)
 * ──────────────────────────────────────────────────
 * 
 * Best for: Changing employee or completely different time
 * 
 * Steps:
 * 1. Click red DELETE button on shift card
 * 2. Confirm deletion
 * 3. Use "Add Shift" button to create new shift with different details
 * 
 * Why not just edit?
 * - Current system validates: NO DUPLICATE SHIFTS PER DAY
 * - Cannot change employee via drag (shift is tied to employee)
 * - Cannot change to overlapping time (validation prevents it)
 * 
 * If you need to change employee or make complex edits:
 * DELETE OLD → CREATE NEW
 */

// ============================================================================
// LIMITATIONS & CURRENT CONSTRAINTS
// ============================================================================

/**
 * What CANNOT be done yet:
 * 
 * ❌ Cannot drag edge to resize shift
 *    Reason: Time grid only moves by hour blocks
 *    Workaround: Delete and recreate with custom time
 * 
 * ❌ Cannot click empty slot to create shift
 *    Reason: Complex due to employee selection needed
 *    Workaround: Use "Add Shift" button at top
 * 
 * ❌ Cannot change employee by dragging
 *    Reason: Shift is bound to employee ID
 *    Workaround: Delete old shift, create new with different employee
 * 
 * ❌ Cannot set minutes (only hour-based slots)
 *    Reason: Grid design for simplicity
 *    Workaround: Use "Add Shift" dialog for custom times
 * 
 * ✓ VALIDATIONS:
 *   • No overlapping shifts per employee
 *   • No duplicate shifts on same day (max 1 per employee per day)
 *   • Time automatically adjusted for night shifts (crosses midnight)
 *   • Shift duration preserved when moving
 */

// ============================================================================
// REAL-WORLD MANAGER WORKFLOWS
// ============================================================================

/**
 * SCENARIO 1: Quick Schedule Change (Manager at 9 AM)
 * ───────────────────────────────────────────────────
 * 
 * "I need to move Sam from 6-2 PM on Monday to 2-10 PM instead"
 * 
 * Action: DRAG the shift
 * 1. Find Sam's shift on Monday at 6 AM row
 * 2. Drag it to Monday at 2 PM row
 * 3. Done! ✓
 * 
 * Time to complete: 3 seconds
 * Number of clicks: 1 (drag operation)
 */

/**
 * SCENARIO 2: Staff Called In Sick
 * ────────────────────────────────
 * 
 * "John called in sick for his Wednesday 6 AM shift. 
 *  I need to have Sarah cover it instead."
 * 
 * Actions:
 * 1. DELETE John's shift on Wednesday (click delete button)
 * 2. CREATE new shift for Sarah
 *    - Click "Add Shift"
 *    - Select Sarah
 *    - Click Wednesday
 *    - Select Morning (6 AM - 2 PM)
 *    - Create
 * 
 * Time to complete: 15 seconds
 * Number of clicks: ~5
 */

/**
 * SCENARIO 3: Swapping Two Employees
 * ──────────────────────────────────
 * 
 * "John and Sam want to swap their Wednesday shifts.
 *  John has 6 AM, Sam has 2 PM."
 * 
 * Actions:
 * 1. DRAG John's shift from Wed 6 AM → Wed 2 PM
 *    ❌ FAILS: Sam already has that slot
 *    
 * Alternative:
 * 1. Delete both shifts
 * 2. Create Sam's shift at 6 AM
 * 3. Create John's shift at 2 PM
 * 
 * OR use "Shift Trading" feature if available
 */

// ============================================================================
// CURRENT API OPERATIONS
// ============================================================================

/**
 * When Manager DRAGS a shift:
 * 
 * API CALL: PUT /api/shifts/{shiftId}
 * Body: {
 *   startTime: "2025-12-08T14:00:00.000Z",  // ISO string
 *   endTime: "2025-12-08T22:00:00.000Z"
 * }
 * 
 * Backend validates:
 * ✓ No time overlap with other shifts for same employee
 * ✓ Time boundaries respected
 * ✓ Return updated shift object
 * 
 * Result: Real-time UI update, no page refresh needed
 */

/**
 * When Manager DELETES a shift:
 * 
 * API CALL: DELETE /api/shifts/{shiftId}
 * 
 * No body needed, just the ID
 * 
 * Backend validates:
 * ✓ Shift exists
 * ✓ User has permission (manager role)
 * 
 * Result: Shift removed from calendar immediately
 */

/**
 * When Manager CREATES via dialog:
 * 
 * API CALL: POST /api/shifts
 * Body: {
 *   userId: "employee-uuid",
 *   branchId: "branch-uuid",
 *   position: "Staff",
 *   startTime: "2025-12-08T06:00:00.000Z",
 *   endTime: "2025-12-08T14:00:00.000Z",
 *   status: "scheduled"
 * }
 * 
 * Backend validates:
 * ✓ No duplicate shift on same day
 * ✓ No time overlaps
 * ✓ Valid employee and branch
 * 
 * Result: New shift created and appears on calendar
 */

// ============================================================================
// VISUAL FEEDBACK FOR MANAGERS
// ============================================================================

/**
 * When hovering over shift card:
 * - Cursor changes from "pointer" to "grab" (if manager)
 * - Card slightly enlarges (scale effect)
 * - Drop shadow appears
 * - Delete button becomes fully visible
 * 
 * When dragging:
 * - Shift card becomes semi-transparent (50% opacity)
 * - Cursor changes to "grabbing"
 * - Target time slot highlights with hover effect
 * 
 * When dropping:
 * - Shift card moves to new location
 * - Brief loading state
 * - Success: card updates with new time
 * - Error: card returns to original position + error message
 */

// ============================================================================
// FUTURE ENHANCEMENTS (NOT YET IMPLEMENTED)
// ============================================================================

/**
 * These features could be added to make it even more like Homebase:
 * 
 * 1. RESIZE SHIFTS by dragging bottom edge
 *    - Drag from 9 AM to 1 PM = 4-hour shift
 *    - Uses 15-minute increments
 * 
 * 2. QUICK-CREATE by clicking empty slot
 *    - Click on empty time slot
 *    - Shows popup to select employee
 *    - Auto-fills that day and time
 *    - Quick confirm
 * 
 * 3. EDIT DIALOG by clicking shift card
 *    - Shows current details
 *    - Can edit time with time picker
 *    - Can edit notes
 *    - Submit to update
 * 
 * 4. COLOR CODING by shift type
 *    - Morning shifts: Yellow/gold
 *    - Afternoon shifts: Blue
 *    - Night shifts: Dark blue/purple
 * 
 * 5. EMPLOYEE DRAG FROM SIDEBAR
 *    - List of employees on left
 *    - Drag employee name to empty slot
 *    - Creates shift for that employee
 * 
 * 6. COPY SHIFT functionality
 *    - Right-click shift → Copy
 *    - Right-click different day/time → Paste
 *    - Creates duplicate with new time
 * 
 * 7. BULK EDIT
 *    - Select multiple shifts
 *    - Change time for all at once
 *    - Shift entire group to different day
 */

export const DRAG_DROP_GUIDE = "See documentation above";
