package com.neurofleetx.controller;

import com.neurofleetx.model.Trip;
import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.TripRepository;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/trips")
@CrossOrigin(origins = "*")
public class TripController {

        @Autowired
        private TripRepository tripRepo;

        @Autowired
        private UserRepository userRepo;

        @Autowired
        private VehicleRepository vehicleRepo;

        // --- Legacy Recommendations Support (for Autocomplete) ---
        private static final List<Map<String, Object>> recommendations = new ArrayList<>();

        static {
                // Mock Data
                recommendations.add(createTrip("Coimbatore Airport to Gandhipuram", "Coimbatore International Airport",
                                "Gandhipuram Bus Stand", 11.029, 77.043, 11.016, 76.955));
                recommendations.add(createTrip("Railway Station to Brookefields", "Coimbatore Junction",
                                "Brookefields Mall", 10.998, 76.961, 11.006, 76.963));
                recommendations.add(createTrip("Saravanampatti to Tidel Park", "Saravanampatti",
                                "Tidel Park Coimbatore", 11.079, 76.996, 11.033, 77.019));
                recommendations.add(createTrip("Ukkadam to Marudhamalai", "Ukkadam Bus Stand", "Marudhamalai Temple",
                                10.993, 76.960, 11.047, 76.883));
        }

        private static Map<String, Object> createTrip(String label, String start, String end, double sLat, double sLng,
                        double eLat, double eLng) {
                Map<String, Object> map = new HashMap<>();
                map.put("label", label);
                map.put("startLocation", start);
                map.put("endLocation", end);
                map.put("startCoords", Map.of("lat", sLat, "lng", sLng));
                map.put("endCoords", Map.of("lat", eLat, "lng", eLng));
                return map;
        }

        @GetMapping("/recommendations")
        public List<Map<String, Object>> getTripRecommendations(@RequestParam(required = false) String query) {
                if (query != null && !query.isEmpty()) {
                        String lowerQ = query.toLowerCase();
                        return recommendations.stream()
                                        .filter(t -> t.get("label").toString().toLowerCase().contains(lowerQ))
                                        .toList();
                }
                return recommendations;
        }

        // --- New Real Trip Features (DB Based) ---

        // Post a new trip (Driver)
        @PostMapping("/post")
        public ResponseEntity<?> postTrip(@RequestBody Trip tripRequest) {
                try {
                        // Validate driver existence
                        Optional<User> driverOpt = userRepo.findById(tripRequest.getDriverId());
                        if (driverOpt.isEmpty()) {
                                return ResponseEntity.badRequest().body("Driver not found");
                        }
                        User driver = driverOpt.get();

                        // Validate vehicle existence (User must have an assigned vehicle)
                        if (driver.getVehicleId() == null) {
                                // AUTO-FIX: Check if a vehicle exists for this driver based on email
                                Optional<Vehicle> existingVehicle = vehicleRepo.findAll().stream()
                                                .filter(v -> driver.getEmail().equalsIgnoreCase(v.getDriverEmail()))
                                                .findFirst();

                                if (existingVehicle.isPresent()) {
                                        Vehicle v = existingVehicle.get();
                                        driver.setVehicleId(v.getId());
                                        userRepo.save(driver);
                                        System.out.println("🔧 [Self-Healing] Linked Driver " + driver.getEmail()
                                                        + " to existing Vehicle ID " + v.getId());
                                } else {
                                        return ResponseEntity.badRequest().body("Driver has no assigned vehicle");
                                }
                        }
                        Optional<Vehicle> vehicleOpt = vehicleRepo.findById(driver.getVehicleId());
                        if (vehicleOpt.isEmpty()) {
                                return ResponseEntity.badRequest().body("Vehicle not found");
                        }

                        // Set vehicle ID and Defaults
                        tripRequest.setVehicleId(driver.getVehicleId());
                        tripRequest.setStatus("AVAILABLE");
                        tripRequest.setCreatedAt(LocalDateTime.now());
                        tripRequest.setUpdatedAt(LocalDateTime.now());

                        Trip savedTrip = tripRepo.save(tripRequest);

                        // AUTO-UPDATE: Set driver to ONLINE when they post a trip
                        driver.setIsOnline(true);
                        driver.setLastLogin(LocalDateTime.now());

                        // Update location if provided in trip start
                        if (tripRequest.getFromLat() != null && tripRequest.getFromLng() != null) {
                                driver.setCurrentLat(tripRequest.getFromLat());
                                driver.setCurrentLng(tripRequest.getFromLng());
                        }
                        userRepo.save(driver);

                        return ResponseEntity.ok(Map.of("message", "Trip posted successfully", "trip", savedTrip));
                } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.internalServerError().body("Error posting trip: " + e.getMessage());
                }
        }

        // Search for trips (Customer)
        @GetMapping("/search")
        public ResponseEntity<?> searchTrips(
                        @RequestParam String from,
                        @RequestParam String to,
                        @RequestParam String date) {
                try {
                        LocalDate searchDate = LocalDate.parse(date);
                        List<Trip> trips = tripRepo.searchTrips(from, to, searchDate);

                        List<Map<String, Object>> response = trips.stream().map(trip -> {
                                Map<String, Object> map = new HashMap<>();
                                map.put("trip", trip);

                                // Add Driver Details
                                userRepo.findById(trip.getDriverId()).ifPresent(d -> map.put("driver", d));

                                // Add Vehicle Details
                                vehicleRepo.findById(trip.getVehicleId()).ifPresent(v -> map.put("vehicle", v));

                                return map;
                        }).toList();

                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        return ResponseEntity.internalServerError().body("Error searching trips: " + e.getMessage());
                }
        }

        // Get active trips for a specific driver
        @GetMapping("/driver/{driverId}")
        public ResponseEntity<?> getDriverTrips(@PathVariable Long driverId) {
                List<Trip> trips = tripRepo.findByDriverIdAndStatus(driverId, "AVAILABLE");
                return ResponseEntity.ok(trips);
        }

        // Cancel a trip
        @PutMapping("/{id}/cancel")
        public ResponseEntity<?> cancelTrip(@PathVariable Long id) {
                Optional<Trip> tripOpt = tripRepo.findById(id);
                if (tripOpt.isPresent()) {
                        Trip trip = tripOpt.get();
                        trip.setStatus("CANCELLED");
                        tripRepo.save(trip);
                        return ResponseEntity.ok(Map.of("message", "Trip cancelled successfully"));
                }
                return ResponseEntity.badRequest().body("Trip not found");
        }
}
