package com.neurofleetx.controller;

import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.Trip;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import com.neurofleetx.repo.TripRepository;
import com.neurofleetx.repo.ReviewRepository;
import com.neurofleetx.repo.BookingRepository;
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
    private TripRepository tripRepo;

    @Autowired
    private ReviewRepository reviewRepo;

    @Autowired
    private BookingRepository bookingRepo;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // Get all drivers with count
    @GetMapping("/drivers")
    public ResponseEntity<Map<String, Object>> getAllDrivers() {
        List<User> drivers = userRepo.findByRole("driver");
        Long driverCount = userRepo.countByRole("driver");

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
                    if (vehicleData.getDriverPhotoUrl() != null && !vehicleData.getDriverPhotoUrl().isEmpty()) {
                        driver.setProfilePhotoUrl(vehicleData.getDriverPhotoUrl());
                    }
                    if (vehicleData.getDriverContact() != null && !vehicleData.getDriverContact().isEmpty()) {
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

    // Get online drivers with live trip details
    @GetMapping("/drivers/online")
    public ResponseEntity<List<Map<String, Object>>> getOnlineDrivers() {
        List<User> onlineDrivers = userRepo.findByRoleAndIsOnlineTrue("driver");

        List<Map<String, Object>> response = onlineDrivers.stream().map(driver -> {
            Map<String, Object> map = new HashMap<>();
            map.put("driver", driver);

            // Get Vehicle
            if (driver.getVehicleId() != null) {
                vehicleRepo.findById(driver.getVehicleId()).ifPresent(v -> map.put("vehicle", v));
            }

            // Get Active Trip (Posted)
            List<Trip> activeTrips = tripRepo.findByDriverIdAndStatus(driver.getId(), "AVAILABLE");
            if (!activeTrips.isEmpty()) {
                map.put("activeTrip", activeTrips.get(0));
            }

            // Get Active Booking (Assigned/Enroute)
            if (driver.getVehicleId() != null) {
                List<com.neurofleetx.model.Booking> activeBookings = bookingRepo.findAll().stream()
                        .filter(b -> b.getVehicle() != null && b.getVehicle().getId().equals(driver.getVehicleId()))
                        .filter(b -> List.of("CONFIRMED", "ENROUTE", "PICKED_UP").contains(b.getStatus()))
                        .toList();
                if (!activeBookings.isEmpty()) {
                    map.put("activeBooking", activeBookings.get(0));
                }
            }

            return map;
        }).toList();

        return ResponseEntity.ok(response);
    }
}
