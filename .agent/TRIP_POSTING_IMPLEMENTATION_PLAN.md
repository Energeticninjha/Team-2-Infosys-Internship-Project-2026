# Trip Posting & Ride Search - Implementation Plan

## 🎯 Overview

This feature enables:
1. **Drivers** to post available trips on specific routes
2. **Customers** to search for rides and view available drivers
3. **Managers** to see all drivers and track currently available (logged-in) drivers

---

## 📊 Database Schema Changes

### 1. New Table: `trips` (Posted Trips by Drivers)

```sql
CREATE TABLE trips (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id BIGINT,
    vehicle_id BIGINT,
    from_location VARCHAR(255),
    to_location VARCHAR(255),
    from_lat DOUBLE,
    from_lng DOUBLE,
    to_lat DOUBLE,
    to_lng DOUBLE,
    available_date DATE,
    available_time TIME,
    status VARCHAR(50), -- 'AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED'
    seats_available INT,
    price_per_seat DOUBLE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);
```

### 2. Update `users` Table

```sql
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN current_lat DOUBLE;
ALTER TABLE users ADD COLUMN current_lng DOUBLE;
```

### 3. Update `vehicles` Table

```sql
ALTER TABLE vehicles ADD COLUMN current_trip_id BIGINT;
ALTER TABLE vehicles ADD FOREIGN KEY (current_trip_id) REFERENCES trips(id);
```

---

## 🔧 Backend Implementation

### 1. New Model: `Trip.java`

```java
@Entity
@Table(name = "trips")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long driverId;
    private Long vehicleId;
    
    private String fromLocation;
    private String toLocation;
    private Double fromLat;
    private Double fromLng;
    private Double toLat;
    private Double toLng;
    
    private LocalDate availableDate;
    private LocalTime availableTime;
    
    private String status; // AVAILABLE, BOOKED, COMPLETED, CANCELLED
    private Integer seatsAvailable;
    private Double pricePerSeat;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

### 2. New Repository: `TripRepository.java`

```java
public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findByDriverId(Long driverId);
    List<Trip> findByStatus(String status);
    List<Trip> findByFromLocationAndToLocationAndStatus(
        String from, String to, String status
    );
    Optional<Trip> findByDriverIdAndStatus(Long driverId, String status);
}
```

### 3. New Controller: `TripController.java`

**Endpoints:**

```java
// Driver posts a trip
POST /api/trips/post
Body: { fromLocation, toLocation, fromLat, fromLng, toLat, toLng, 
        availableDate, availableTime, seatsAvailable, pricePerSeat }
Response: { message: "Trip posted successfully", trip: {...} }

// Get driver's active trips
GET /api/trips/driver/{driverId}
Response: [ {...}, {...} ]

// Search trips by route
GET /api/trips/search?from={location}&to={location}&date={date}
Response: [ {...}, {...} ]

// Cancel trip
PUT /api/trips/{id}/cancel
Response: { message: "Trip cancelled" }
```

### 4. Update `UserController.java`

**New Endpoints:**

```java
// Update user online status
PUT /api/users/{id}/online
Body: { isOnline: true, currentLat: 11.0168, currentLng: 76.9558 }
Response: { message: "Status updated" }

// Get all online drivers
GET /api/users/drivers/online
Response: [ {...}, {...} ]

// Get all drivers
GET /api/users/drivers/all
Response: [ {...}, {...} ]
```

---

## 🎨 Frontend Implementation

### 1. Driver Dashboard - Trip Posting

**New Component**: `TripPostingForm.js`

**Features:**
- Form fields: From, To, Date, Time, Seats Available, Price
- Auto-fill current location as "From"
- Map integration for location selection
- Submit → POST to `/api/trips/post`
- Show active trip status

**UI Location**: Driver Dashboard → New tab "Post Trip"

### 2. Customer Dashboard - Ride Search

**Enhanced Component**: `CustomerDashboard.js`

**Features:**
- Search form: From, To, Date, Time
- On search → GET `/api/trips/search`
- Show route preview on map (Leaflet)
- Display available drivers as cards
- Click card → Show driver details modal

**Driver Card Structure:**
```jsx
<div className="driver-card">
  <img src={vehicle.vehiclePhotoUrl} />
  <h5>{vehicle.model}</h5>
  <p>Driver: {driver.name}</p>
  <p>⭐ {driver.rating} ({driver.totalTrips} trips)</p>
  <p>Seats: {trip.seatsAvailable}</p>
  <p>Price: ₹{trip.pricePerSeat}/seat</p>
  <button>View Details</button>
</div>
```

**Driver Details Modal:**
- Driver photo, name, phone, email, rating
- Vehicle photo, model, plate, type, seats
- Trip details: From, To, Date, Time
- "Select This Vehicle" button

### 3. Manager Dashboard - Driver Classification

**Enhanced Component**: `DriverManagement.js`

**New Tabs:**
1. **All Drivers** (existing)
2. **Available Drivers** (new)

**Available Drivers Tab Features:**
- Shows only online drivers (isOnline = true)
- Displays:
  - Driver profile
  - Vehicle details
  - Rating (or "New Driver")
  - Current location (clickable)
  - Trip status: "Trip not posted" or "Coimbatore → Chennai"
- Click location → Opens map modal
- Map shows car marker at driver's current position
- Hover car marker → Shows driver details popup

**Map Integration:**
```jsx
<MapContainer center={[driver.currentLat, driver.currentLng]} zoom={13}>
  <Marker position={[driver.currentLat, driver.currentLng]} icon={CarIcon}>
    <Popup>
      <b>{driver.name}</b><br/>
      {vehicle.model}<br/>
      ⭐ {driver.rating}
    </Popup>
  </Marker>
</MapContainer>
```

---

## 🔄 User Flows

### Flow 1: Driver Posts Trip

1. Driver logs in → Dashboard
2. Clicks "Post Trip" tab
3. Fills form:
   - From: Coimbatore (auto-filled from current location)
   - To: Palani
   - Date: 2026-02-06
   - Time: 10:00 AM
   - Seats: 4
   - Price: ₹200/seat
4. Submits → Trip created with status "AVAILABLE"
5. Driver's vehicle linked to trip
6. Driver status updated to "online"

### Flow 2: Customer Searches Ride

1. Customer logs in → Dashboard
2. Enters search:
   - From: Coimbatore
   - To: Palani
   - Date: 2026-02-06
   - Time: 10:00 AM
3. Clicks "Search Routes"
4. System shows:
   - Route preview on map (Coimbatore → Palani)
   - List of available drivers (ALL drivers with matching trips)
5. Customer clicks driver card
6. Modal opens with full driver & vehicle details
7. Customer clicks "Select This Vehicle"
8. Booking created

### Flow 3: Manager Views Available Drivers

1. Manager logs in → Dashboard
2. Clicks "Drivers" → "Available Drivers" tab
3. Sees list of online drivers:
   - Driver 1: Trip posted "Coimbatore → Palani"
   - Driver 2: "Trip not posted"
4. Clicks "Current Location" for Driver 1
5. Map modal opens showing:
   - Car marker at Coimbatore (driver's current location)
   - Route line to Palani
6. Hovers car marker → Popup shows driver details

---

## 📁 Files to Create/Modify

### Backend (Java):
1. ✅ Create `Trip.java` model
2. ✅ Create `TripRepository.java`
3. ✅ Create `TripController.java`
4. ✅ Update `User.java` (add isOnline, lastLogin, currentLat, currentLng)
5. ✅ Update `Vehicle.java` (add currentTripId)
6. ✅ Update `UserController.java` (add online status endpoints)

### Frontend (React):
1. ✅ Create `TripPostingForm.js` (Driver Dashboard)
2. ✅ Update `DriverDashboard.js` (add Post Trip tab)
3. ✅ Update `CustomerDashboard.js` (enhance search, add driver list)
4. ✅ Create `DriverDetailsModal.js` (Customer Dashboard)
5. ✅ Update `DriverManagement.js` (add Available Drivers tab)
6. ✅ Create `DriverLocationMap.js` (Manager Dashboard)

---

## 🎨 UI Design References

Based on the screenshots provided:

### Customer Search Page:
- Dark theme with teal/cyan accents
- Clean search form with autocomplete
- Route preview map at top
- Driver cards in grid below map
- Click card → Full-screen modal with details

### Driver Details Modal:
- Large vehicle photo at top
- Two-column layout:
  - Left: Driver info (photo, name, phone, email, rating)
  - Right: Vehicle info (model, type, seats, number)
- Trip details section (From, To, Date, Time)
- "Select This Vehicle" button (teal/cyan)

### Manager Available Drivers:
- Table/card layout with driver info
- Current location as clickable link
- Trip status badge
- Map modal with car markers

---

## 🚀 Implementation Order

### Phase 1: Backend (Day 1)
1. Create Trip model, repository, controller
2. Update User and Vehicle models
3. Add trip posting endpoints
4. Add trip search endpoints
5. Add online status endpoints

### Phase 2: Driver Dashboard (Day 2)
1. Create Trip Posting Form
2. Add "Post Trip" tab
3. Integrate with backend
4. Show active trip status

### Phase 3: Customer Dashboard (Day 3)
1. Enhance search functionality
2. Add route preview map
3. Fetch and display available drivers
4. Create driver details modal
5. Integrate booking flow

### Phase 4: Manager Dashboard (Day 4)
1. Add "Available Drivers" tab
2. Fetch online drivers
3. Display trip status
4. Create location map modal
5. Add car markers with popups

### Phase 5: Testing & Polish (Day 5)
1. End-to-end testing
2. UI/UX refinements
3. Performance optimization
4. Bug fixes

---

## 🔒 Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: 
   - Only drivers can post trips
   - Only customers can search trips
   - Only managers can view all drivers
3. **Validation**:
   - Validate location coordinates
   - Validate date/time (future only)
   - Validate seats available
4. **Privacy**:
   - Hide driver phone until booking confirmed
   - Show approximate location only

---

## 📊 Success Metrics

1. **Driver Engagement**: % of drivers posting trips
2. **Customer Satisfaction**: Successful bookings from search
3. **Manager Efficiency**: Time to track available drivers
4. **System Performance**: Search response time < 2s

---

**Status**: 📝 **PLAN READY - AWAITING APPROVAL**

Would you like me to proceed with implementation?
