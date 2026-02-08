# Diff Report: Project 2 (Current) vs Handover Report (Target)

This report details the files that need modification to align Project 2 with the desired features from the Handover Report.

## 1. Pricing Engine
**Feature**: 30rs/km base price + 40% one-way surcharge logic.
**Current State**: Pricing is currently calculated on the frontend using a simplified formula: `150 + (vehicleId * 10) + (duration * 125)`. The backend `BookingService` accepts this client-provided price without validation.
**Required Updates**:
*   **`frontend/src/components/Dashboard/CustomerDashboard.js`**: 
    *   Update `confirmBooking` function to implement the precise formula: `(Distance * 30) * 1.40`. 
    *   Ensure distance is retrieved from the details (currently `routeObj.distance`).
*   **`backend/src/main/java/com/neurofleetx/service/BookingService.java`**: 
    *   (Recommended) Add server-side price validation in `createBooking` to enforce this logic and prevent tampering.

## 2. Map Visualization
**Feature**: Road-aligned paths using DirectionsRenderer.
**Current State**: The project currently uses `react-leaflet` with `Polyline` to draw paths. 
**Required Updates**:
*   **`frontend/src/components/Dashboard/CustomerDashboard.js`**: 
    *   Replace `react-leaflet` components (`MapContainer`, `Polyline`, `Marker`) with `@react-google-maps/api` components (`GoogleMap`, `DirectionsRenderer`, `Marker`).
    *   Update state management to handle Google Maps Directions Service responses instead of OSRM/Leaflet.
*   **`frontend/src/components/Dashboard/DriverDashboard.js`**: 
    *   Replace `react-leaflet` with Google Maps components to ensure consistent navigation visualization.
*   **`frontend/public/index.html`**: 
    *   Add the Google Maps JavaScript API script tag with the API key.
*   **`frontend/package.json`**: 
    *   Add `@react-google-maps/api` dependency and remove `react-leaflet`, `leaflet`.

## 3. Manager Dashboard
**Feature**: Approval UI that displays Driver details (photo/name/rating).
**Current State**: The `ManagerDashboard.js` displays a list of `recommendedDrivers` or `pendingBookings` but only shows `driverName` and `driverRating`. It lacks the Driver Photo and a distinct "Approval" section if referring to Vehicle Approval.
**Required Updates**:
*   **`frontend/src/components/Dashboard/ManagerDashboard.js`**: 
    *   Update the driver list item (in `assignments` view) to include an `<img>` tag for the driver's photo. (Ensure the backend `Vehicle` or `User` DTO includes the photo URL).

## 4. Search UI
**Feature**: Searchable trip dropdown in the Customer dashboard that auto-fills fields.
**Current State**: `CustomerDashboard.js` uses standard text `<input>` fields for "Pickup Location" and "Destination".
**Required Updates**:
*   **`frontend/src/components/Dashboard/CustomerDashboard.js`**: 
    *   Replace `<input>` fields with a searchable Dropdown/Autocomplete component (e.g., Google Places Autocomplete if switching to Google Maps, or a custom Select component).
    *   Implement "Auto-fill" logic to populate coordinates upon selection.
