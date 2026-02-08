package com.neurofleetx.controller;

import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.VehicleRepository;
import com.neurofleetx.repo.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private com.neurofleetx.repo.UserRepository userRepo;

    @Autowired
    private com.neurofleetx.repo.BookingRepository bookingRepo;

    @Autowired
    private ReviewRepository reviewRepo;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @GetMapping("/kpi")
    public Map<String, Object> getKpi() {
        Map<String, Object> kpi = new HashMap<>();
        long totalVehicles = vehicleRepo.count();
        long totalUsers = userRepo.count();
        List<com.neurofleetx.model.Booking> allBookings = bookingRepo.findAll();
        List<com.neurofleetx.model.Vehicle> allVehicles = vehicleRepo.findAll();

        java.time.LocalDate today = java.time.LocalDate.now();

        // Trips Today: bookings where startTime is today
        long tripsToday = allBookings.stream()
                .filter(b -> b.getStartTime() != null && b.getStartTime().toLocalDate().equals(today))
                .count();

        // Active Routes: vehicles with status ENROUTE
        long activeRoutes = allVehicles.stream()
                .filter(v -> "ENROUTE".equalsIgnoreCase(v.getStatus()))
                .count();

        // Revenue Today: sum amount for bookings completed today
        double revenueToday = allBookings.stream()
                .filter(b -> "COMPLETED".equals(b.getStatus()) && b.getEndTime() != null
                        && b.getEndTime().toLocalDate().equals(today))
                .mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0)
                .sum();

        // Active Trips (Overall live trips)
        long activeTrips = allBookings.stream()
                .filter(b -> "ENROUTE".equals(b.getStatus()) || "CONFIRMED".equals(b.getStatus())).count();

        long drivers = userRepo.findAll().stream().filter(u -> "DRIVER".equalsIgnoreCase(u.getRole())).count();

        kpi.put("totalVehicles", totalVehicles);
        kpi.put("totalUsers", totalUsers);
        kpi.put("activeTrips", activeRoutes); // User asked for Active Routes in KPI card
        kpi.put("tripsToday", tripsToday);
        kpi.put("revenueToday", revenueToday);
        kpi.put("utilization", totalVehicles > 0 ? (double) activeRoutes / totalVehicles * 100 : 0.0);
        kpi.put("drivers", drivers);
        return kpi;
    }

    @GetMapping("/users")
    public List<com.neurofleetx.model.User> getAllUsers() {
        return userRepo.findAll();
    }

    @GetMapping("/users/{id}")
    public com.neurofleetx.model.User getUser(@PathVariable Long id) {
        return userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        userRepo.deleteById(id);
    }

    @PutMapping("/users/{id}")
    public com.neurofleetx.model.User updateUser(@PathVariable Long id,
            @RequestBody com.neurofleetx.model.User updates) {
        return userRepo.findById(id).map(user -> {
            if (updates.getName() != null)
                user.setName(updates.getName());
            if (updates.getPhone() != null)
                user.setPhone(updates.getPhone());
            if (updates.getProfilePhotoUrl() != null)
                user.setProfilePhotoUrl(updates.getProfilePhotoUrl());
            return userRepo.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    // ============ DRIVER MANAGEMENT (Admin Level) ============

    // Get all drivers
    @GetMapping("/drivers")
    public ResponseEntity<Map<String, Object>> getAllDrivers() {
        List<User> drivers = userRepo.findByRole("driver");
        Long driverCount = userRepo.countByRole("driver");

        Map<String, Object> response = new HashMap<>();
        response.put("count", driverCount);
        response.put("drivers", drivers);

        return ResponseEntity.ok(response);
    }

    // Get driver details
    @GetMapping("/drivers/{id}")
    public ResponseEntity<?> getDriverDetails(@PathVariable Long id) {
        Optional<User> driverOpt = userRepo.findById(id);

        if (driverOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User driver = driverOpt.get();
        Map<String, Object> details = new HashMap<>();
        details.put("driver", driver);

        if (driver.getVehicleId() != null) {
            Optional<Vehicle> vehicle = vehicleRepo.findById(driver.getVehicleId());
            vehicle.ifPresent(v -> details.put("vehicle", v));
        }

        return ResponseEntity.ok(details);
    }

    // Block driver
    @PutMapping("/drivers/{id}/block")
    public ResponseEntity<?> blockDriver(@PathVariable Long id) {
        Optional<User> driverOpt = userRepo.findById(id);
        if (driverOpt.isEmpty())
            return ResponseEntity.notFound().build();

        User driver = driverOpt.get();
        driver.setIsBlocked(true);
        userRepo.save(driver);
        return ResponseEntity.ok(Map.of("message", "Driver blocked", "driver", driver));
    }

    // Unblock driver
    @PutMapping("/drivers/{id}/unblock")
    public ResponseEntity<?> unblockDriver(@PathVariable Long id) {
        Optional<User> driverOpt = userRepo.findById(id);
        if (driverOpt.isEmpty())
            return ResponseEntity.notFound().build();

        User driver = driverOpt.get();
        driver.setIsBlocked(false);
        userRepo.save(driver);
        return ResponseEntity.ok(Map.of("message", "Driver unblocked", "driver", driver));
    }

    // Add driver
    @PostMapping("/drivers/add")
    public ResponseEntity<?> addDriver(@RequestBody Map<String, String> driverData) {
        try {
            Optional<User> existing = userRepo.findByEmail(driverData.get("email"));
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
            }

            User newDriver = User.builder()
                    .name(driverData.get("name"))
                    .email(driverData.get("email"))
                    .password(passwordEncoder.encode(driverData.get("password")))
                    .phone(driverData.get("phone"))
                    .role("driver")
                    .licenseNumber(driverData.get("licenseNumber"))
                    .build();

            User savedDriver = userRepo.save(newDriver);
            return ResponseEntity.ok(Map.of("message", "Driver added", "driver", savedDriver));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ============ VEHICLE MANAGEMENT (Admin Level) ============

    // Get pending vehicles
    @GetMapping("/vehicles/pending")
    public ResponseEntity<List<Vehicle>> getPendingVehicles() {
        List<Vehicle> allVehicles = vehicleRepo.findAll();
        List<Vehicle> pendingVehicles = allVehicles.stream()
                .filter(v -> "Pending".equals(v.getStatus()) || "Pending".equals(v.getDocumentStatus()))
                .toList();
        return ResponseEntity.ok(pendingVehicles);
    }

    // Approve vehicle
    @PutMapping("/vehicles/{id}/approve")
    public ResponseEntity<?> approveVehicle(@PathVariable Long id) {
        Optional<Vehicle> vehicleOpt = vehicleRepo.findById(id);
        if (vehicleOpt.isEmpty())
            return ResponseEntity.notFound().build();

        Vehicle vehicle = vehicleOpt.get();
        vehicle.setStatus("Active");
        vehicle.setDocumentStatus("Verified");
        vehicle.setLastUpdate(LocalDateTime.now());
        vehicleRepo.save(vehicle);
        return ResponseEntity.ok(Map.of("message", "Vehicle approved", "vehicle", vehicle));
    }

    // Reject vehicle
    @PutMapping("/vehicles/{id}/reject")
    public ResponseEntity<?> rejectVehicle(@PathVariable Long id) {
        Optional<Vehicle> vehicleOpt = vehicleRepo.findById(id);
        if (vehicleOpt.isEmpty())
            return ResponseEntity.notFound().build();

        Vehicle vehicle = vehicleOpt.get();
        vehicle.setStatus("Rejected");
        vehicle.setDocumentStatus("Not-Verified");
        vehicle.setLastUpdate(LocalDateTime.now());
        vehicleRepo.save(vehicle);
        return ResponseEntity.ok(Map.of("message", "Vehicle rejected", "vehicle", vehicle));
    }

    // Add vehicle
    @PostMapping("/vehicles/add")
    public ResponseEntity<?> addVehicle(@RequestBody Vehicle vehicleData) {
        try {
            vehicleData.setStatus("Active");
            vehicleData.setDocumentStatus("Verified");
            vehicleData.setLastUpdate(LocalDateTime.now());

            Vehicle savedVehicle = vehicleRepo.save(vehicleData);

            if (vehicleData.getDriverEmail() != null && !vehicleData.getDriverEmail().isEmpty()) {
                Optional<User> driverOpt = userRepo.findByEmail(vehicleData.getDriverEmail());
                if (driverOpt.isPresent()) {
                    User driver = driverOpt.get();
                    driver.setVehicleId(savedVehicle.getId());
                    userRepo.save(driver);
                }
            }

            return ResponseEntity.ok(Map.of("message", "Vehicle added", "vehicle", savedVehicle));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
