# 📘 NeuroFleetX - Project Handover Report

## 1. Project Overview
**Project Name:** NeuroFleetX  
**Description:** A comprehensive fleet management and ride-hailing platform connecting drivers, customers, and fleet managers. The system facilitates vehicle onboarding, trip management, real-time booking, and AI-powered navigation visualization.

**Current Status:**  
✅ **Fully Functional**: Authentication, Vehicle Management, Dashboard functionalities, and Interactive Maps.  
✅ **Tested**: Verified with automated scripts and manual testing scenarios.

---

## 2. Technology Stack

### **Backend (Server-Side)**
- **Framework:** Java Spring Boot (v3.x estimated)
- **Language:** Java 17
- **Database:** MySQL
- **Security:** Spring Security + JWT (JSON Web Tokens)
- **Tools:** Maven (Build), Lombok (Boilerplate reduction)
- **Key Dependencies:**
  - `spring-boot-starter-data-jpa` (Database Access)
  - `spring-boot-starter-security` (Auth)
  - `jjwt` (Token generation)
  - `google-maps-services` (Geo-services)

### **Frontend (Client-Side)**
- **Framework:** React 19
- **Build Tool:** Vite
- **Styling:** Vanilla CSS (Modern, Responsive, Dark Theme default)
- **Maps:** Leaflet.js (`react-leaflet`) with OpenStreetMap tiles & OSRM Routing
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **State Management:** React Hooks (`useState`, `useEffect`, `useContext`)

---

## 3. Project Architecture

### **Directory Structure**
```
neurofleetx/
├── backend/
│   └── neurofleetx/src/main/java/com/neurofleetx/
│       ├── auth/          # Authentication & User Management (Controller, Service, Entity)
│       ├── trip/          # Trip, Booking & Offer Management
│       ├── vehicle/       # Vehicle Inventory & Lifecycle
│       ├── review/        # Ratings & Feedback System
│       └── config/        # Security, CORS, & App Config
│
├── neurofleetx-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/     # Admin Dashboard & Controls
│   │   │   ├── manager/   # Fleet Manager Operations
│   │   │   ├── driver/    # Driver Dashboard & Navigation
│   │   │   └── customer/  # Customer Booking Interface
│   │   ├── components/    # Reusable UI Components
│   │   ├── services/      # API Integration (Axios calls)
│   │   └── routes/        # App Routing Configuration
│   └── public/            # Static Assets
```

---

## 4. Key Modules & Features

### **A. Authentication & Roles (RBAC)**
- **Roles:** `ADMIN`, `MANAGER`, `DRIVER`, `CUSTOMER`
- **Features:** 
  - Secure Login/Register flows.
  - Role-based redirection (e.g., Drivers go to Driver Dashboard).
  - JWT-based session management.

### **B. Vehicle Management**
- **Flow:** Driver adds vehicle -> Status `PENDING` -> Manager/Admin `APPROVES` -> Status `AVAILABLE`.
- **Data:** Tracks Model, Number, Type (Car/Bike/Van), and Photos.
- **Rules:** Drivers can only see/manage their own vehicles.

### **C. Trip & Booking System**
- **Trip Offers:** Drivers create trip offers (Source, Destination, Time, Price).
- **Booking:** Customers view available trips and book them.
- **Workflow:** Search -> Book -> Confirm.

### **D. AI Navigation (Unique Feature)**
- **Visualization:** Smooth, animated vehicle movement on map.
- **Routing:** Displays **Multiple Routes** (Optimized vs Alternatives) using OSRM.
- **Tech:** Uses linear interpolation for smooth marker animation on Leaflet maps.

---

## 5. Database Schema (Inferred)

### **Users Table**
- `id`, `email`, `password`, `role`, `name`, `status`

### **Vehicles Table**
- `id`, `driver_id` (FK), `model`, `vehicle_number`, `type`, `status` (`AVAILABLE`, `IN_USE`), `is_approved`

### **Trips / TripOffers Table**
- `id`, `driver_id`, `vehicle_id`, `source`, `destination`, `start_time`, `price`, `status`

### **Bookings Table**
- `id`, `trip_id`, `customer_id`, `booking_status`, `payment_status`

---

## 6. User Workflows

### **Scenario 1: New Driver Onboarding**
1. User registers as **Driver**.
2. Log in and navigate to **"Add Vehicle"**.
3. Fill details (Car Model, Number, Photo).
4. System marks vehicle as **Pending**.
5. **Manager** logs in -> Reviews vehicle -> Clicks **Approve**.
6. Driver now sees vehicle as **Available** and can post trips.

### **Scenario 2: Customer Booking**
1. User registers as **Customer**.
2. Searches for trips (e.g., "Coimbatore" to "Chennai").
3. Views available drivers/vehicles.
4. Clicks **Book**.
5. Booking is confirmed/pending driver acceptance.

### **Scenario 3: Driver Navigation**
1. Driver starts a trip.
2. Goes to **Navigation** tab.
3. Views real-time animated path from Origin to Destination with alternative routes shown.

---

## 7. Setup & Installation

### **Prerequisites**
- Java JDK 17+
- Node.js & npm
- MySQL Server

### **Step 1: Database Setup**
- Configure MySQL credentials in `backend/neurofleetx/src/main/resources/application.properties`.
- Ensure schema is created (auto-create enabled via Hibernate).

### **Step 2: Start Backend**
```powershell
cd backend/neurofleetx
./mvnw spring-boot:run
# Server starts on localhost:8083
```

### **Step 3: Start Frontend**
```powershell
cd neurofleetx-frontend
npm install
npm run dev
# Client starts on localhost:5173
```

### **Step 4: Verification**
Run the included test script to verify core APIs:
```powershell
./test-api.ps1
```

---

## 8. Handover Notes for Development Team

- **Design System:** The UI uses pure CSS variables in `index.css`. Maintain this for consistency; do not mix with Tailwind unless refactoring.
- **Map Config:** Navigation uses free OSRM servers. For production, consider hosting a local OSRM instance or switching to a paid provider if traffic scales.
- **Security:** Ensure `SecurityConfig.java` endpoints are updated if new controllers are added.
- **Testing:** Use the provided PowerShell scripts (`quick-test.ps1`, `test-api.ps1`) for rapid regression testing.

---
**Report Generated via Antigravity Agent** 
*Date: 2026-02-04*
