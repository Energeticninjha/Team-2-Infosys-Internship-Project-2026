# Driver Status Management Guide

## How to Switch Between Statuses

### **The Status Dropdown is ALWAYS Visible**
No matter what status you're in (Available, Maintenance, or Offline), the status dropdown header will always be visible at the top of your dashboard. This means you can **always** switch back to any status at any time.

---

## Status Options & How to Switch

### 🟢 **Available (Active)**
**What it means:**
- You are ready to accept new jobs
- Vehicle is operational and online
- Telemetry cards are visible (Speed, Battery, Odometer, Vehicle ID)
- Battery charges when idle

**How to switch TO this status:**
1. Click the status dropdown (visible at top of dashboard)
2. Select "🟢 Available"
3. Status updates immediately
4. Telemetry cards appear
5. You can now accept jobs

**Visual Indicators:**
- Purple gradient header background
- All 4 telemetry cards visible
- Subtitle: "Ready to accept jobs"

---

### 🔧 **Maintenance**
**What it means:**
- Vehicle is under maintenance/repair
- Cannot accept new jobs
- Telemetry cards hidden (not operational)
- Battery does NOT charge

**How to switch TO this status:**
1. Click the status dropdown
2. Select "🔧 Maintenance"
3. Status updates immediately
4. Telemetry cards disappear
5. Warning notice appears

**Visual Indicators:**
- Pink/Red gradient header background
- Telemetry cards hidden
- Subtitle: "Vehicle under maintenance"
- Yellow alert box with instructions

**How to GO BACK to Available:**
1. The dropdown is still visible at the top
2. Simply select "🟢 Available" from the dropdown
3. Instantly back online!

---

### 🔴 **Offline**
**What it means:**
- Driver is not working/logged off
- Cannot accept new jobs
- Telemetry cards hidden
- Battery does NOT charge

**How to switch TO this status:**
1. Click the status dropdown
2. Select "🔴 Offline"
3. Status updates immediately
4. Telemetry cards disappear
5. Notice appears

**Visual Indicators:**
- Dark gray gradient header background
- Telemetry cards hidden
- Subtitle: "Currently offline"
- Gray alert box with instructions

**How to GO BACK to Available:**
1. The dropdown is still visible at the top
2. Simply select "🟢 Available" from the dropdown
3. Instantly back online!

---

## Quick Reference Table

| Status | Can Accept Jobs? | Telemetry Visible? | Battery Charges? | Header Color | How to Switch Back |
|--------|------------------|-------------------|------------------|--------------|-------------------|
| 🟢 Available | ✅ Yes | ✅ Yes | ✅ Yes | Purple | N/A (already available) |
| 🔧 Maintenance | ❌ No | ❌ No | ❌ No | Pink/Red | Select "🟢 Available" |
| 🔴 Offline | ❌ No | ❌ No | ❌ No | Dark Gray | Select "🟢 Available" |

---

## Important Notes

### ✅ **You Can ALWAYS Switch Back**
- The status dropdown is **permanently visible** (except for Pending/Rejected vehicles)
- You don't need to refresh the page
- You don't need manager approval
- It's instant - just select the status you want

### 📋 **When Status Dropdown is Hidden**
The dropdown will ONLY be hidden if:
- Your vehicle status is "Pending" (waiting for manager approval)
- Your vehicle status is "Rejected" (access revoked)

In these cases, you need manager action first before you can control your status.

### 🔄 **Status Persistence**
- Your status is saved to the database
- If you logout and login again, your last status is restored
- Managers can see your current status in their dashboard

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│         DRIVER DASHBOARD - STATUS HEADER                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Driver Status                    [Dropdown ▼]    │  │
│  │  Ready to accept jobs                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────┴────────────┐
              │   Select New Status     │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   🟢 Available      🔧 Maintenance      🔴 Offline
        │                  │                  │
        ▼                  ▼                  ▼
  Telemetry Shows    Telemetry Hidden   Telemetry Hidden
  Can Accept Jobs    Cannot Accept      Cannot Accept
  Battery Charges    No Charging        No Charging
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Dropdown Still Visible │
              │  Can Switch Anytime!    │
              └────────────────────────┘
```

---

## Example Scenarios

### **Scenario 1: Going for Lunch**
1. Currently: 🟢 Available
2. Action: Select "🔴 Offline" from dropdown
3. Result: Status changes, telemetry hidden, alert shows
4. After lunch: Select "🟢 Available" from dropdown
5. Result: Back online, telemetry visible, ready for jobs

### **Scenario 2: Vehicle Needs Repair**
1. Currently: 🟢 Available
2. Action: Select "🔧 Maintenance" from dropdown
3. Result: Status changes, cannot accept jobs, alert shows
4. After repair: Select "🟢 Available" from dropdown
5. Result: Back online, ready to work

### **Scenario 3: End of Shift**
1. Currently: 🟢 Available
2. Action: Select "🔴 Offline" from dropdown
3. Result: Status saved, logout
4. Next day: Login → Status still "Offline"
5. Action: Select "🟢 Available" to start shift
6. Result: Ready to work!

---

## Troubleshooting

**Q: I selected Maintenance and now I can't see the dropdown!**
A: This shouldn't happen anymore! The dropdown is always visible. If you don't see it, refresh the page.

**Q: How do I know if my status changed?**
A: You'll see:
- Alert message confirming the change
- Header background color changes
- Subtitle text changes
- Telemetry cards appear/disappear

**Q: Can I switch from Offline directly to Maintenance?**
A: Yes! You can switch between any statuses directly. You don't need to go through Available first.

**Q: Will switching status affect my active trip?**
A: If you have an active trip in progress, it's recommended to complete it first. The system will prevent status changes during active trips.

---

## Summary

✅ **Status dropdown is ALWAYS visible** (for Active/Maintenance/Offline vehicles)  
✅ **You can switch back to Available anytime** by selecting it from the dropdown  
✅ **No manager approval needed** to change your own status  
✅ **Instant updates** - changes take effect immediately  
✅ **Clear visual feedback** - header color and alerts show current status  

**Bottom line:** You're never "stuck" in Maintenance or Offline mode. Just use the dropdown to go back to Available! 🎉
