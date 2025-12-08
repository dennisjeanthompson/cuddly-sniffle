# Shift Trading Workflow - Modern Payroll System

## Overview
The shift trading system enables employees to request shifts trades with their colleagues and allows managers to oversee and approve these exchanges. This ensures proper coverage and fair shift allocation while maintaining company policies.

## Three-Stage Approval Workflow

### Stage 1: Employee Request
**Who**: Employee
**What**: An employee with an assigned shift wants to trade with a colleague
**How it works**:
1. Employee navigates to "Shift Trading" section
2. Selects ONE OF THEIR FUTURE SHIFTS (must be a shift assigned to them)
3. Selects a colleague to trade with
4. Specifies urgency level (Low, Normal, Urgent)
5. Provides reason for the trade
6. Submits request

**System behavior**:
- Only shows **FUTURE shifts** (shifts that haven't occurred yet)
- Only shows shifts where the current user is the assigned employee
- Request status becomes "pending"
- Target employee receives notification

### Stage 2: Employee Acceptance
**Who**: Target Employee (the colleague being asked to trade)
**What**: The requested employee reviews and responds to the trade request
**How it works**:
1. Target employee sees "Incoming Requests" tab
2. Reviews details: who wants to trade, which shift, reason
3. Decides to accept or decline
4. If accepted: status becomes "accepted" and moves to manager queue
5. If declined: status becomes "rejected" and request ends

**Key rule**: Only the target employee can respond to their pending requests

### Stage 3: Manager Approval
**Who**: Manager/Admin
**What**: Manager reviews accepted trades to ensure operational needs are met
**How it works**:
1. Manager sees "Manager Approvals" tab (only for managers)
2. Reviews all "accepted" trades waiting for approval
3. Can approve or reject based on:
   - Schedule coverage needs
   - Staffing requirements
   - Company policies
4. If approved: trade is finalized, shifts are swapped
5. If rejected: trade is rejected despite employee agreement

**Final status**: "approved" or "rejected"

## Shift Selection Rules

### Only Future Shifts
- Employees can ONLY trade shifts that haven't happened yet
- Past shifts cannot be traded (operational records)
- System automatically filters past dates from the modal

### Employee's Own Shifts
- Employee A can only request to trade their own assigned shifts
- Cannot request to trade another employee's shift
- Manager can initiate trades for any employee

## Trade Statuses

| Status | Meaning | Next Action |
|--------|---------|-------------|
| **pending** | Awaiting target employee response | Target accepts/declines |
| **accepted** | Target employee agreed | Awaiting manager approval |
| **approved** | Manager approved the trade | Trade is finalized |
| **rejected** | Either target or manager rejected | Trade is cancelled |

## Data Flow

```
Employee Request
    ↓
[Pending] - Awaits Target Employee
    ↓
Target Accepts/Declines
    ↓
[Accepted] → Manager Queue
    ↓
Manager Approves/Rejects
    ↓
[Approved] or [Rejected]
    ↓
Shifts are Swapped (if approved) OR Cancelled
```

## API Endpoints

### Get All Shift Trades
```
GET /api/shift-trades
```
Returns all trades for current user (as requester or target) plus pending trades if manager

### Create New Trade Request
```
POST /api/shift-trades
Body: {
  shiftId: string,
  targetUserId: string,
  reason: string,
  urgency: "low" | "normal" | "urgent"
}
```

### Respond to Trade (Target Employee)
```
PATCH /api/shift-trades/:id
Body: { status: "accepted" | "rejected" }
```

### Manager Approval
```
PATCH /api/shift-trades/:id/approve
Body: { status: "approved" | "rejected" }
```
Requires manager/admin role

## Real-Time Features

- WebSocket connections enable live updates
- All trade list changes broadcast immediately
- Employees see new incoming requests in real-time
- Managers see newly accepted trades instantly
- Polling fallback (5 seconds) for reliability

## Best Practices

1. **Reason Required**: Always provide a reason for better manager decision-making
2. **Advance Notice**: Submit trades with adequate notice (at least 48 hours recommended)
3. **Clear Communication**: Use urgency levels appropriately
4. **Coverage First**: Ensure shifts are properly covered before trading
5. **Policy Compliance**: Follow company shift-trading policies

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot find shift" | Invalid shift ID | Select valid shift from dropdown |
| "You can only trade your own shifts" | Employee trying to trade colleague's shift | Only select your assigned shifts |
| "Cannot approve trade without target user" | Manager approving unopened trade | Wait for target to accept first |
| "You cannot respond to this trade" | Wrong employee responding | Only target can respond |

## Security & Validation

- Authentication required on all endpoints
- Employees can only trade their own shifts
- Only target employee can accept/reject their trades
- Only managers can approve trades
- Shift data validated before trade creation
- Cross-branch trading prevented (branch validation)
