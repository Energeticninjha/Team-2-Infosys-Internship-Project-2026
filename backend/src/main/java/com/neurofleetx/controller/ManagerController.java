package com.neurofleetx.controller;

import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;

import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;

import com.neurofleetx.repo.ReviewRepository;
import com.neurofleetx.repo.BookingRepository;
import com.neurofleetx.repo.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/manager")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001" })
public class ManagerController {

        @Autowired
        private UserRepository userRepo;

        @Autowired
        private VehicleRepository vehicleRepo;

        @Autowired
        private ReviewRepository reviewRepo;

        @Autowired
        private BookingRepository bookingRepo;

        @Autowired
        private TripRepository tripRepo;

        private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        // Get all drivers with count
        @GetMapping("/drivers")
        public ResponseEntity<Map<String, Object>> getAllDrivers() {
                List<User> drivers = userRepo.findByRoleIgnoreCase("driver");
                Long driverCount = userRepo.countByRoleIgnoreCase("driver");

                Map<String, Object> response = new HashMap<>();
                response.put("count", driverCount);
                response.put("drivers", drivers);

                return ResponseEntity.ok(response);
        }

        // Get driver details by ID
        @GetMapping("/drivers/{id}")
        public ResponseEntity<?> getDriverDetails(@PathVariable Long id) {
                Optional<User> driverOpt = userRepo.findById(id);

                if (driverOpt.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                User driver = driverOpt.get();
                Map<String, Object> details = new HashMap<>();
                details.put("driver", driver);

                // Get assigned vehicle
                if (driver.getVehicleId() != null) {
                        Optional<Vehicle> vehicle = vehicleRepo.findById(driver.getVehicleId());
                        vehicle.ifPresent(v -> details.put("vehicle", v));
                }

                // Get driver's bookings
                List<com.neurofleetx.model.Booking> bookings = bookingRepo.findByVehicleDriverName(driver.getName());
                details.put("bookings", bookings);

                // Get driver's reviews
                if (driver.getVehicleId() != null) {
                        List<com.neurofleetx.model.Review> reviews = reviewRepo
                                        .findByVehicleIdOrderByCreatedAtDesc(driver.getVehicleId());
                        details.put("reviews", reviews);
                }

                // Calculate performance metrics
                long completedTrips = bookings.stream().filter(b -> "COMPLETED".equals(b.getStatus())).count();
                double totalEarnings = bookings.stream()
                                .filter(b -> "COMPLETED".equals(b.getStatus()))
                                .mapToDouble(com.neurofleetx.model.Booking::getAmount)
                                .sum();

                details.put("completedTrips", completedTrips);
                details.put("totalEarnings", totalEarnings);

                return ResponseEntity.ok(details);
        }

        // Block driver
        @PutMapping("/drivers/{id}/block")
        public ResponseEntity<?> blockDriver(@PathVariable Long id) {
                Optional<User> driverOpt = userRepo.findById(id);

                if (driverOpt.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                User driver = driverOpt.get();
                driver.setIsBlocked(true);
                userRepo.save(driver);

                return ResponseEntity.ok(Map.of("message", "Driver blocked successfully", "driver", driver));
        }

        // Unblock driver
        @PutMapping("/drivers/{id}/unblock")
        public ResponseEntity<?> unblockDriver(@PathVariable Long id) {
                Optional<User> driverOpt = userRepo.findById(id);

                if (driverOpt.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                User driver = driverOpt.get();
                driver.setIsBlocked(false);
                userRepo.save(driver);

                return ResponseEntity.ok(Map.of("message", "Driver unblocked successfully", "driver", driver));
        }

        // Add new driver
        @PostMapping("/drivers/add")
        public ResponseEntity<?> addDriver(@RequestBody Map<String, String> driverData) {
                try {
                        // Check if email already exists
                        Optional<User> existing = userRepo.findByEmail(driverData.get("email"));
                        if (existing.isPresent()) {
                                return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
                        }

                        // Create new driver
                        User newDriver = User.builder()
                                        .name(driverData.get("name"))
                                        .email(driverData.get("email"))
                                        .password(passwordEncoder.encode(driverData.get("password")))
                                        .phone(driverData.get("phone"))
                                        .role("driver")
                                        .licenseNumber(driverData.get("licenseNumber"))
                                        .isBlocked(false)
                                        .performanceScore(5.0)
                                        .build();

                        User savedDriver = userRepo.save(newDriver);

                        return ResponseEntity.ok(Map.of(
                                        "message", "Driver added successfully",
                                        "driver", savedDriver));
                } catch (Exception e) {
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                }
        }

        // Add vehicle for driver
        @PostMapping("/vehicles/add")
        public ResponseEntity<?> addVehicle(@RequestBody Vehicle vehicleData) {
                try {
                        // Set default values
                        vehicleData.setStatus("Pending");
                        vehicleData.setDocumentStatus("Pending");
                        vehicleData.setLastUpdate(LocalDateTime.now());

                        // Save vehicle
                        Vehicle savedVehicle = vehicleRepo.save(vehicleData);

                        // Update driver's vehicleId if driverEmail is provided
                        if (vehicleData.getDriverEmail() != null && !vehicleData.getDriverEmail().isEmpty()) {
                                Optional<User> driverOpt = userRepo.findByEmail(vehicleData.getDriverEmail());
                                if (driverOpt.isPresent()) {
                                        User driver = driverOpt.get();
                                        driver.setVehicleId(savedVehicle.getId());

                                        // Sync Driver Photo and Phone to User Profile
                                        if (vehicleData.getDriverPhotoUrl() != null
                                                        && !vehicleData.getDriverPhotoUrl().isEmpty()) {
                                                driver.setProfilePhotoUrl(vehicleData.getDriverPhotoUrl());
                                        }
                                        if (vehicleData.getDriverContact() != null
                                                        && !vehicleData.getDriverContact().isEmpty()) {
                                                driver.setPhone(vehicleData.getDriverContact());
                                        }

                                        userRepo.save(driver);
                                }
                        }

                        return ResponseEntity.ok(Map.of(
                                        "message", "Vehicle added successfully",
                                        "vehicle", savedVehicle));
                } catch (Exception e) {
                        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                }
        }

        // Get pending vehicle approvals
        @GetMapping("/vehicles/pending")
        public ResponseEntity<List<Vehicle>> getPendingVehicles() {
                List<Vehicle> allVehicles = vehicleRepo.findAll();
                List<Vehicle> pendingVehicles = allVehicles.stream()
                                .filter(v -> "Pending".equals(v.getStatus()) || "Pending".equals(v.getDocumentStatus()))
                                .toList();

                return ResponseEntity.ok(pendingVehicles);
        }

        // Get approved vehicles (Active)
        @GetMapping("/vehicles/approved")
        public ResponseEntity<List<Vehicle>> getApprovedVehicles() {
                List<Vehicle> allVehicles = vehicleRepo.findAll();
                List<Vehicle> approvedVehicles = allVehicles.stream()
                                .filter(v -> "Active".equals(v.getStatus()))
                                .toList();

                return ResponseEntity.ok(approvedVehicles);
        }

        // Approve vehicle
        @PutMapping("/vehicles/{id}/approve")
        public ResponseEntity<?> approveVehicle(@PathVariable Long id) {
                Optional<Vehicle> vehicleOpt = vehicleRepo.findById(id);

                if (vehicleOpt.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                Vehicle vehicle = vehicleOpt.get();
                vehicle.setStatus("Active");
                vehicle.setDocumentStatus("Verified");
                vehicle.setLastUpdate(LocalDateTime.now());
                vehicleRepo.save(vehicle);

                return ResponseEntity.ok(Map.of("message", "Vehicle approved successfully", "vehicle", vehicle));
        }

        // Reject vehicle
        @PutMapping("/vehicles/{id}/reject")
        public ResponseEntity<?> rejectVehicle(@PathVariable Long id) {
                Optional<Vehicle> vehicleOpt = vehicleRepo.findById(id);

                if (vehicleOpt.isEmpty()) {
                        return ResponseEntity.notFound().build();
                }

                Vehicle vehicle = vehicleOpt.get();
                vehicle.setStatus("Rejected");
                vehicle.setDocumentStatus("Not-Verified");
                vehicle.setLastUpdate(LocalDateTime.now());
                vehicleRepo.save(vehicle);

                return ResponseEntity.ok(Map.of("message", "Vehicle rejected", "vehicle", vehicle));
        }

        // Get online drivers with live trip details (only those who have posted trips)
        @GetMapping("/drivers/online")
        public ResponseEntity<List<Map<String, Object>>> getOnlineDrivers() {
                // Get all drivers who are online
                List<User> onlineDrivers = userRepo.findByRoleIgnoreCase("driver")
                                .stream()
                                .filter(u -> Boolean.TRUE.equals(u.getIsOnline()))
                                .toList();

                // Filter to only include drivers who have posted AVAILABLE trips
                List<Map<String, Object>> response = onlineDrivers.stream()
                                .filter(driver -> {
                                        // Check if driver has any AVAILABLE trips posted
                                        return tripRepo.findByDriverIdAndStatus(driver.getId(), "AVAILABLE").size() > 0;
                                })
                                .map(driver -> {
                                        Map<String, Object> map = new HashMap<>();
                                        map.put("driver", driver);

                                        // Get Vehicle
                                        if (driver.getVehicleId() != null) {
                                                vehicleRepo.findById(driver.getVehicleId())
                                                                .ifPresent(v -> map.put("vehicle", v));
                                        }

                                        // Get Posted Trip (from Trip table)
                                        List<com.neurofleetx.model.Trip> driverTrips = tripRepo
                                                        .findByDriverIdAndStatus(driver.getId(), "AVAILABLE");
                                        if (!driverTrips.isEmpty()) {
                                                com.neurofleetx.model.Trip trip = driverTrips.get(0);
                                                Map<String, Object> tripData = new HashMap<>();
                                                tripData.put("id", trip.getId());
                                                tripData.put("fromLocation", trip.getFromLocation());
                                                tripData.put("toLocation", trip.getToLocation());
                                                tripData.put("fromLat", trip.getFromLat());
                                                tripData.put("fromLng", trip.getFromLng());
                                                tripData.put("status", trip.getStatus());
                                                map.put("activeTrip", tripData);
                                        }

                                        // Also check for active bookings
                                        List<com.neurofleetx.model.Booking> driverBookings = bookingRepo
                                                        .findByVehicleDriverName(driver.getName());
                                        java.util.Optional<com.neurofleetx.model.Booking> activeBooking = driverBookings
                                                        .stream()
                                                        .filter(b -> "ENROUTE".equals(b.getStatus())
                                                                        || "PICKED_UP".equals(b.getStatus())
                                                                        || "ACCEPTED".equals(b.getStatus()))
                                                        .findFirst();

                                        if (activeBooking.isPresent()) {
                                                Map<String, Object> bookingData = new HashMap<>();
                                                com.neurofleetx.model.Booking b = activeBooking.get();
                                                bookingData.put("id", b.getId());
                                                bookingData.put("fromLocation", b.getStartLocation());
                                                bookingData.put("toLocation", b.getEndLocation());
                                                bookingData.put("status", b.getStatus());
                                                map.put("activeBooking", bookingData);
                                        }

                                        return map;
                                }).toList();

                return ResponseEntity.ok(response);
        }
}
