package com.neurofleetx.controller;

import com.neurofleetx.model.Booking;
import com.neurofleetx.model.Review;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.User;
import com.neurofleetx.repo.BookingRepository;
import com.neurofleetx.repo.ReviewRepository;
import com.neurofleetx.repo.VehicleRepository;
import com.neurofleetx.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/driver")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001" })
public class DriverController {

    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ReviewRepository reviewRepo;

    @Autowired
    private BookingRepository bookingRepo;

    @GetMapping("/debug/state")
    public Map<String, Object> getDebugState() {
        Map<String, Object> state = new HashMap<>();
        state.put("totalBookings", bookingRepo.count());
        state.put("allBookings", bookingRepo.findAll());
        state.put("allVehicles", vehicleRepo.findAll());
        return state;
    }

    @GetMapping("/{driverName}/bookings")
    public List<Booking> getAssignedBookings(@PathVariable String driverName) {
        System.out.println("🔍 [DriverController] Fetching bookings for Driver: [" + driverName + "]");
        List<Booking> bookings = bookingRepo.findByVehicleDriverName(driverName);
        System.out.println("✅ [DriverController] Found " + bookings.size() + " bookings for [" + driverName + "]");
        return bookings;
    }

    @GetMapping("/{driverName}/telemetry")
    public ResponseEntity<?> getTelemetry(@PathVariable String driverName) {
        Optional<Vehicle> vehicle = vehicleRepo.findAll().stream()
                .filter(v -> driverName.equalsIgnoreCase(v.getDriverName()))
                .findFirst();

        if (vehicle.isPresent()) {
            return ResponseEntity.ok(vehicle.get());
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{driverName}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String driverName,
            @RequestBody Map<String, String> statusUpdate) {
        String newStatus = statusUpdate.get("status");
        Optional<Vehicle> vehicleOpt = vehicleRepo.findAll().stream()
                .filter(v -> driverName.equalsIgnoreCase(v.getDriverName()))
                .findFirst();

        if (vehicleOpt.isPresent()) {
            Vehicle vehicle = vehicleOpt.get();
            vehicle.setStatus(newStatus);
            vehicle.setLastUpdate(LocalDateTime.now());
            vehicleRepo.save(vehicle);
            return ResponseEntity.ok(vehicle);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{driverName}/reviews")
    public List<Review> getReviews(@PathVariable String driverName) {
        Optional<Vehicle> vehicle = vehicleRepo.findAll().stream()
                .filter(v -> driverName.equalsIgnoreCase(v.getDriverName()))
                .findFirst();

        if (vehicle.isPresent()) {
            return reviewRepo.findByVehicleIdOrderByCreatedAtDesc(vehicle.get().getId());
        }
        return List.of();
    }

    @GetMapping("/{driverName}/earnings")
    public Map<String, Object> getEarnings(@PathVariable String driverName) {
        List<Booking> bookings = bookingRepo.findByVehicleDriverName(driverName);
        double totalEarnings = bookings.stream()
                .filter(b -> "COMPLETED".equals(b.getStatus()))
                .mapToDouble(Booking::getAmount)
                .sum();
        long completedTrips = bookings.stream().filter(b -> "COMPLETED".equals(b.getStatus())).count();

        Optional<Vehicle> vehicle = vehicleRepo.findAll().stream()
                .filter(v -> driverName.equalsIgnoreCase(v.getDriverName()))
                .findFirst();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEarnings", totalEarnings);
        stats.put("completedTrips", completedTrips);
        stats.put("rating", vehicle.map(Vehicle::getDriverRating).orElse(5.0));
        return stats;
    }

    // New Driver Status (Online/Offline) - using ID
    @PutMapping("/{id}/online-status")
    public ResponseEntity<?> updateOnlineStatus(@PathVariable Long id, @RequestBody Map<String, Boolean> status) {
        Optional<User> driverOpt = userRepo.findById(id);
        if (driverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Driver not found");
        }

        User driver = driverOpt.get();
        if (status.containsKey("isOnline")) {
            driver.setIsOnline(status.get("isOnline"));
            driver.setLastLogin(LocalDateTime.now());
            userRepo.save(driver);
        }

        return ResponseEntity.ok(Map.of("message", "Status updated", "isOnline", driver.getIsOnline()));
    }

    // New Driver Location - using ID
    @PutMapping("/{id}/location")
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody Map<String, Double> location) {
        Optional<User> driverOpt = userRepo.findById(id);
        if (driverOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Driver not found");
        }

        User driver = driverOpt.get();
        if (location.containsKey("lat") && location.containsKey("lng")) {
            driver.setCurrentLat(location.get("lat"));
            driver.setCurrentLng(location.get("lng"));
            userRepo.save(driver);
        }

        return ResponseEntity.ok(Map.of("message", "Location updated"));
    }
}
