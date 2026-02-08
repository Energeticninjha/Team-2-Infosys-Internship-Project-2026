# Real-Time Telemetry System - Implementation Guide

## Overview
The real-time telemetry system provides live vehicle data updates in the Driver Dashboard, including speed, battery, odometer, and driver status management.

## Features Implemented

### 1. **Status Toggle Header**
- **Location**: Driver Dashboard (top of page when vehicle is Active)
- **Functionality**: Dropdown to instantly change driver availability
- **Options**:
  - 🟢 **Available** - Ready to accept jobs
  - 🔧 **Maintenance** - Vehicle under maintenance
  - 🔴 **Offline** - Driver is offline

**How it works**:
- When status changes, frontend calls `PUT /api/vehicles/{id}` with new status
- Backend status mapping:
  - "Available" → "Active"
  - "Maintenance" → "Maintenance"
  - "Offline" → "Inactive"
- Vehicle status updates in database
- UI refreshes to reflect new status

### 2. **Real-Time Telemetry Cards**

#### **Live Speed Card** 🚗
- **Display**: Current vehicle speed in km/h
- **Progress Bar**: Visual indicator (0-120 km/h scale)
- **Update Logic**:
  - **During Trip** (`isTripping = true`): Speed varies between 20-80 km/h with realistic fluctuations
  - **Idle**: Speed gradually decreases to 0 km/h

#### **Battery Card** 🔋
- **Display**: Current battery percentage
- **Progress Bar**: Color-coded
  - Green (>50%)
  - Yellow (20-50%)
  - Red (<20%)
- **Update Logic**:
  - **During Trip**: Drains at 0.05% per second (realistic for EV)
  - **Idle (Available status)**: Charges at 0.1% per second
  - **Maintenance/Offline**: No charging

#### **Vehicle ID Card** 🚙
- **Display**: Number plate and vehicle model
- **Static Data**: Shows vehicle identification
- **No real-time updates**: Informational only

#### **Odometer Card** 📊
- **Display**: Total kilometers driven (1 decimal place)
- **Update Logic**:
  - **During Trip**: Increments based on speed
  - Formula: `odometer += (speed / 3600)` per second
  - Example: At 60 km/h, adds ~0.017 km per second
  - **Idle**: No change

### 3. **Telemetry Simulation Logic**

#### **Update Frequency**
- Telemetry updates every **1 second** (1000ms interval)
- Only runs when vehicle exists and status is not "Pending"

#### **State Management**
```javascript
const [telemetry, setTelemetry] = useState({
    speed: 0,           // km/h
    battery: 100,       // percentage
    odometer: 0,        // kilometers
    fuelPercent: 100    // percentage (reserved for future)
});
```

#### **Sync with Backend**
- On vehicle data fetch, telemetry syncs with backend values:
  - `batteryPercent` → `telemetry.battery`
  - `odometer` → `telemetry.odometer`
  - `speed` → `telemetry.speed`

#### **Trip Detection**
- `isTripping` state determines if driver is actively on a trip
- Set to `true` when navigation starts
- Set to `false` when trip completes

## Backend Integration

### **API Endpoints Used**

1. **Get Vehicle Data**
   ```
   GET /api/vehicles/driver/{driverName}
   ```
   - Returns vehicle with telemetry fields
   - Frontend syncs telemetry state with response

2. **Update Vehicle Status**
   ```
   PUT /api/vehicles/{id}
   Body: { "status": "Active" | "Maintenance" | "Inactive" }
   ```
   - Updates driver availability status
   - Affects telemetry charging behavior

3. **Update Telemetry** (Future Enhancement)
   ```
   PUT /api/vehicles/{id}
   Body: { 
     "speed": 45.5,
     "batteryPercent": 87.3,
     "odometer": 12345.6
   }
   ```
   - Can persist telemetry to database
   - Currently handled client-side only

### **Database Fields (Vehicle Entity)**
```java
private Double speed;           // km/h
private Double odometer;        // total distance in km
private Integer batteryPercent; // 0-100
private Integer fuelPercent;    // 0-100 (reserved)
```

## User Experience Flow

### **Scenario 1: Driver Goes Online**
1. Driver logs in → Dashboard loads
2. Vehicle status shows "Active"
3. Status header displays "🟢 Available"
4. Telemetry cards show:
   - Speed: 0 km/h
   - Battery: 100% (or last known value)
   - Odometer: Total distance driven
5. Battery slowly charges if < 100%

### **Scenario 2: Driver Accepts Job**
1. Driver accepts booking
2. Navigation starts → `isTripping = true`
3. Telemetry updates:
   - Speed: Varies 20-80 km/h
   - Battery: Drains at 0.05%/sec
   - Odometer: Increases based on speed
4. Real-time visual feedback on dashboard

### **Scenario 3: Driver Completes Trip**
1. Trip marked complete → `isTripping = false`
2. Speed: Gradually decreases to 0
3. Battery: Starts charging (if Available)
4. Odometer: Stops incrementing
5. Status remains "Available"

### **Scenario 4: Driver Goes to Maintenance**
1. Driver selects "🔧 Maintenance" from dropdown
2. Backend updates vehicle status to "Maintenance"
3. Telemetry continues but battery doesn't charge
4. Driver cannot accept new jobs

## Performance Considerations

### **Client-Side Simulation**
- Telemetry runs entirely in browser (no server load)
- Uses `setInterval` with 1-second updates
- Cleanup on component unmount prevents memory leaks

### **Backend Sync**
- Vehicle data fetched every 10 seconds
- Telemetry state merges with backend data
- Prevents drift between client and server

### **Future Enhancements**
1. **WebSocket Integration**: Real-time bidirectional updates
2. **Persist Telemetry**: Save to database periodically
3. **Historical Data**: Track telemetry over time
4. **Alerts**: Low battery warnings, maintenance reminders
5. **GPS Integration**: Real speed from device GPS

## Testing the Feature

### **Manual Test Steps**
1. Login as driver with active vehicle
2. Verify status header shows with dropdown
3. Verify 4 telemetry cards display correctly
4. Change status to "Maintenance" → Confirm backend updates
5. Start a trip (accept booking) → Watch speed/battery/odometer update
6. Complete trip → Verify speed returns to 0, battery charges
7. Let battery drain to <20% → Verify red progress bar
8. Check odometer increments during trip

### **Expected Behavior**
- ✅ Status changes update immediately
- ✅ Telemetry updates every second
- ✅ Battery drains during trips, charges when idle
- ✅ Speed varies realistically during trips
- ✅ Odometer increases based on distance traveled
- ✅ Progress bars reflect current values with color coding

## Code Structure

### **State Variables**
- `driverStatus`: Current driver availability (Available/Maintenance/Offline)
- `telemetry`: Object containing speed, battery, odometer, fuel
- `telemetryInterval`: Ref to interval for cleanup

### **Key Functions**
- `handleStatusChange(newStatus)`: Updates driver status via API
- `fetchBaseData()`: Syncs vehicle data and telemetry from backend
- Telemetry `useEffect`: Runs simulation every second

### **UI Components**
- Status Header: Gradient card with dropdown
- Telemetry Cards: 4-column grid with icons, values, progress bars
- Vehicle Info: Existing vehicle details card

## Troubleshooting

### **Telemetry Not Updating**
- Check if vehicle status is "Active" (not "Pending")
- Verify `telemetryInterval` is running (check console)
- Ensure component hasn't unmounted

### **Status Change Fails**
- Check backend is running (port 8083)
- Verify vehicle ID exists
- Check browser console for API errors

### **Battery Not Charging**
- Ensure `driverStatus === 'Available'`
- Check `isTripping === false`
- Verify battery < 100%

## Summary

The telemetry system provides a realistic, real-time view of vehicle status without requiring complex backend infrastructure. It enhances driver experience by showing live data and allowing instant status changes. The system is designed to be extensible for future integration with actual vehicle sensors and GPS data.
