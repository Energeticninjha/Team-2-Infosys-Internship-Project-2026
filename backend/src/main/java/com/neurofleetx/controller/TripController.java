package com.neurofleetx.controller;

import com.neurofleetx.model.Trip;
import com.neurofleetx.model.User;
import com.neurofleetx.repo.TripRepository;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

import java.util.List;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001" })
public class TripController {

    @Autowired
    private TripRepository tripRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private VehicleRepository vehicleRepo;

    @PostMapping("/post")
    public ResponseEntity<?> postTrip(@RequestBody Trip trip) {
        try {
            // Validate driver ID
            if (trip.getDriverId() == null) {
                return ResponseEntity.badRequest().body("Driver ID is required");
            }

            // Enforce online status
            User driver = userRepo.findById(trip.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver not found with ID: " + trip.getDriverId()));

            driver.setIsOnline(true);
            userRepo.save(driver);

            // Find Driver's Active Vehicle
            vehicleRepo.findAll().stream()
                    .filter(v -> v.getDriverName() != null &&
                            v.getDriverName().equals(driver.getName()) &&
                            "Active".equals(v.getStatus()))
                    .findFirst()
                    .ifPresent(v -> {
                        trip.setVehicleId(v.getId());
                        // Keep vehicle as Active since driver is just posting availability
                    });

            // Set trip metadata
            trip.setStartTime(LocalDateTime.now());
            trip.setStatus("AVAILABLE");

            Trip savedTrip = tripRepo.save(trip);
            return ResponseEntity.ok(savedTrip);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Failed to post trip: " + e.getMessage());
        }
    }

    @GetMapping
    public List<Trip> getAllTrips() {
        return tripRepo.findAll();
    }

    @GetMapping("/recommendations")
    public ResponseEntity<?> getRecommendations() {
        try {
            // Return popular route suggestions
            java.util.List<java.util.Map<String, String>> suggestions = java.util.Arrays.asList(
                    java.util.Map.of(
                            "label", "Chennai → Coimbatore",
                            "startLocation", "Chennai",
                            "endLocation", "Coimbatore"),
                    java.util.Map.of(
                            "label", "Coimbatore → Palani",
                            "startLocation", "Coimbatore",
                            "endLocation", "Palani"),
                    java.util.Map.of(
                            "label", "Chennai → Bangalore",
                            "startLocation", "Chennai",
                            "endLocation", "Bangalore"));
            return ResponseEntity.ok(suggestions);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to fetch recommendations");
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchTrips(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String date) {
        try {
            // Get all available trips
            List<Trip> availableTrips = tripRepo.findAll().stream()
                    .filter(t -> "AVAILABLE".equals(t.getStatus()))
                    .collect(java.util.stream.Collectors.toList());

            // Filter by location if provided
            if (from != null && !from.isEmpty()) {
                availableTrips = availableTrips.stream()
                        .filter(t -> t.getFromLocation() != null &&
                                t.getFromLocation().toLowerCase().contains(from.toLowerCase()))
                        .collect(java.util.stream.Collectors.toList());
            }
            if (to != null && !to.isEmpty()) {
                availableTrips = availableTrips.stream()
                        .filter(t -> t.getToLocation() != null &&
                                t.getToLocation().toLowerCase().contains(to.toLowerCase()))
                        .collect(java.util.stream.Collectors.toList());
            }

            // Build response with driver and vehicle details
            java.util.List<java.util.Map<String, Object>> results = new java.util.ArrayList<>();
            for (Trip trip : availableTrips) {
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("trip", trip);

                // Get driver details
                if (trip.getDriverId() != null) {
                    userRepo.findById(trip.getDriverId()).ifPresent(driver -> {
                        java.util.Map<String, Object> driverMap = new java.util.HashMap<>();
                        driverMap.put("id", driver.getId());
                        driverMap.put("name", driver.getName());
                        driverMap.put("phone", driver.getPhone());
                        driverMap.put("isOnline", driver.getIsOnline());
                        driverMap.put("profilePhotoUrl", driver.getProfilePhotoUrl());
                        result.put("driver", driverMap);
                    });
                }

                // Get vehicle details
                if (trip.getVehicleId() != null) {
                    vehicleRepo.findById(trip.getVehicleId()).ifPresent(vehicle -> {
                        java.util.Map<String, Object> vehicleMap = new java.util.HashMap<>();
                        vehicleMap.put("id", vehicle.getId());
                        vehicleMap.put("model", vehicle.getModel());
                        vehicleMap.put("numberPlate", vehicle.getNumberPlate());
                        vehicleMap.put("type", vehicle.getType());
                        vehicleMap.put("seats", vehicle.getSeats());
                        vehicleMap.put("ev", vehicle.getEv());
                        vehicleMap.put("driverRating", vehicle.getDriverRating());
                        result.put("vehicle", vehicleMap);
                    });
                }

                results.add(result);
            }

            return ResponseEntity.ok(results);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to search trips: " + e.getMessage());
        }
    }
}
