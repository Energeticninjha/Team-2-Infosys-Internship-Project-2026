# Driver & Vehicle Management Implementation Plan

## Overview
Implement comprehensive driver and vehicle management features for both Manager and Admin dashboards.

## Backend Changes

### 1. User Model Enhancement
**File**: `User.java`
- Add `isBlocked` field (Boolean) - for blocking/unblocking drivers
- Add `performanceScore` field (Double) - for tracking driver performance
- Add `licenseNumber` field (String) - driver's license number
- Add `vehicleId` field (Long) - link driver to vehicle

### 2. UserRepository Enhancement
**File**: `UserRepository.java`
- Add `List<User> findByRole(String role)` - get all drivers
- Add `Long countByRole(String role)` - count drivers

### 3. New ManagerController Endpoints
**File**: Create `ManagerController.java`
- `GET /api/manager/drivers` - Get all drivers with count
- `GET /api/manager/drivers/{id}` - Get driver details
- `PUT /api/manager/drivers/{id}/block` - Block driver
- `PUT /api/manager/drivers/{id}/unblock` - Unblock driver
- `POST /api/manager/drivers` - Add new driver
- `POST /api/manager/vehicles` - Add new vehicle for driver

### 4. AdminController Enhancement
**File**: `AdminController.java`
- `GET /api/admin/vehicles/pending` - Get pending vehicle approvals
- `PUT /api/admin/vehicles/{id}/approve` - Approve vehicle
- `PUT /api/admin/vehicles/{id}/reject` - Reject vehicle
- `POST /api/admin/drivers` - Add new driver (admin level)
- `POST /api/admin/vehicles` - Add vehicle for driver (admin level)

## Frontend Changes

### 1. Manager Dashboard - Driver Management Section
**File**: `ManagerDashboard.js`

**Features**:
- Driver count display
- Driver list table with:
  - Name, Email, Phone, Rating, Status (Active/Blocked)
  - Performance score
  - Click to view details
- Driver details modal:
  - Full profile
  - Vehicle assigned
  - Trip history
  - Reviews
  - Performance metrics
  - Block/Unblock button
- Add Driver form:
  - Name, Email, Password, Phone, License Number
  - Auto-creates user account
- Add Vehicle form:
  - Select driver from dropdown
  - Vehicle details (model, plate, type, seats)
  - Upload photos
  - Auto-assigns to driver

### 2. Admin Dashboard - Fleet Management Enhancement
**File**: `AdminDashboard.js`

**Features**:
- Under Fleet Management section:
  - Vehicle Approval tab (like Manager)
  - Pending vehicles list
  - Approve/Reject buttons
- Add Driver section:
  - Same as Manager but with admin privileges
- Add Vehicle section:
  - Assign to any driver
  - Override manager decisions

## Database Schema Changes

### Users Table
```sql
ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN performance_score DOUBLE DEFAULT 5.0;
ALTER TABLE users ADD COLUMN license_number VARCHAR(255);
ALTER TABLE users ADD COLUMN vehicle_id BIGINT;
```

### Vehicles Table
```sql
ALTER TABLE vehicles ADD COLUMN approval_status VARCHAR(50) DEFAULT 'Pending';
-- Values: Pending, Approved, Rejected
```

## API Endpoints Summary

### Manager APIs
- `GET /api/manager/drivers` - List all drivers
- `GET /api/manager/drivers/count` - Get driver count
- `GET /api/manager/drivers/{id}` - Get driver details
- `PUT /api/manager/drivers/{id}/block` - Block driver
- `PUT /api/manager/drivers/{id}/unblock` - Unblock driver
- `POST /api/manager/drivers/add` - Add new driver
- `POST /api/manager/vehicles/add` - Add vehicle for driver

### Admin APIs
- All Manager APIs plus:
- `GET /api/admin/vehicles/approvals` - Get pending approvals
- `PUT /api/admin/vehicles/{id}/approve` - Approve vehicle
- `PUT /api/admin/vehicles/{id}/reject` - Reject vehicle
- `POST /api/admin/drivers/add` - Add driver (admin level)
- `POST /api/admin/vehicles/add` - Add vehicle (admin level)

## Implementation Order

1. **Backend - User Model** ✓
2. **Backend - Repositories** ✓
3. **Backend - Manager Controller** ✓
4. **Backend - Admin Controller Enhancement** ✓
5. **Frontend - Manager Dashboard Driver Section** ✓
6. **Frontend - Admin Dashboard Fleet Enhancement** ✓
7. **Testing** ✓

## Security Considerations

- Only Managers can manage drivers in their scope
- Only Admins can override manager decisions
- Blocked drivers cannot login
- Password hashing for new drivers
- Email validation
- License number validation

## Notes

- Driver login uses existing auth system
- Vehicle assignment is one-to-one with driver
- Performance score calculated from reviews
- Block status checked during login
- All changes auto-update database
