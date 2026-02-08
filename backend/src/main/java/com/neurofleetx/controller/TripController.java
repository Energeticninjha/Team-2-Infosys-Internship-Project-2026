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
}
