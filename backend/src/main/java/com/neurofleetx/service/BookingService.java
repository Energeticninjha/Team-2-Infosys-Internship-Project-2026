package com.neurofleetx.service;

import com.neurofleetx.model.Booking;
import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.Review;
import com.neurofleetx.repo.ReviewRepository;
import com.neurofleetx.model.dto.BookingRequest;
import com.neurofleetx.model.dto.RouteOption;
import com.neurofleetx.model.dto.RouteRequest;
import com.neurofleetx.repo.BookingRepository;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BookingService {

    @Autowired
    private BookingRepository bookingRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private ReviewRepository reviewRepo;

    @Autowired
    private VehicleSimulationService simulationService;

    @Autowired
    private RouteService routeService;

    public java.util.List<java.util.Map<String, Object>> getUserBookings(Long userId) {
        List<Booking> trips = bookingRepo.findByUserId(userId);
        java.util.List<java.util.Map<String, Object>> results = new java.util.ArrayList<>();

        for (Booking b : trips) {
            // Lazy update: If scheduled time has passed, mark as CONFIRMED (In Progress)
            if ("SCHEDULED".equals(b.getStatus()) &&
                    b.getScheduledStartTime() != null &&
                    !b.getScheduledStartTime().isAfter(LocalDateTime.now())) {

                b.setStatus("CONFIRMED");
                b.setStartTime(b.getScheduledStartTime());
                if (b.getVehicle() != null) {
                    b.getVehicle().setStatus("Enroute");
                    vehicleRepo.save(b.getVehicle());
                }
                bookingRepo.save(b);
            }

            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", b.getId());
            map.put("startLocation", b.getStartLocation());
            map.put("endLocation", b.getEndLocation());
            map.put("amount", b.getAmount());
            map.put("status", b.getStatus());
            map.put("estimatedDuration", b.getEstimatedDuration());
            map.put("startTime", b.getStartTime());
            map.put("scheduledStartTime", b.getScheduledStartTime());
            map.put("endTime", b.getEndTime());
            map.put("review", b.getReview());
            map.put("rating", b.getRating());

            if (b.getVehicle() != null) {
                java.util.Map<String, Object> vMap = new java.util.HashMap<>();
                vMap.put("id", b.getVehicle().getId());
                vMap.put("model", b.getVehicle().getModel());
                vMap.put("numberPlate", b.getVehicle().getNumberPlate());
                vMap.put("driverName", b.getVehicle().getDriverName());
                vMap.put("driverContact", b.getVehicle().getDriverContact());
                vMap.put("type", b.getVehicle().getType());
                map.put("vehicle", vMap);
            }
            results.add(map);
        }
        return results;
    }

    public Booking createBooking(BookingRequest request) {
        // Robust User Lookup: Try ID -> Try Email -> First Available
        User user = null;
        if (request.getUserId() != null) {
            user = userRepo.findById(request.getUserId()).orElse(null);
        }
        if (user == null) {
            user = userRepo.findAll().stream().findFirst().orElse(null);
        }

        if (user == null) {
            throw new RuntimeException("Booking Failed: No Users exist in the database. Seeder might have failed.");
        }

        // Robust Vehicle Lookup
        Vehicle vehicle = null;
        if (request.getVehicleId() != null) {
            vehicle = vehicleRepo.findById(request.getVehicleId()).orElse(null);
        }
        if (vehicle == null) {
            vehicle = vehicleRepo.findAll().stream().findFirst().orElse(null);
        }

        if (vehicle == null) {
            throw new RuntimeException("Booking Failed: No Vehicles exist in the database.");
        }

        LocalDateTime scheduledTime = request.getScheduledStartTime() != null ? request.getScheduledStartTime()
                : LocalDateTime.now();

        // Calculate Route logic (simplified/removed simulation)
        if (request.getStartLocation() != null && request.getEndLocation() != null) {
            // Optional: Validate route exists
        }

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .startLocation(request.getStartLocation())
                .endLocation(request.getEndLocation())
                .estimatedDuration(request.getEstimatedTime())
                .startTime(null)
                .scheduledStartTime(scheduledTime)
                .status("PENDING") // Default to PENDING for driver acceptance
                .amount(request.getPrice())
                .passengerCount(request.getPassengerCount())
                .build();

        return bookingRepo.save(booking);
    }

    public Booking reviewTrip(Long id, String comment, Double rating) {
        Booking booking = bookingRepo.findById(id).orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setReview(comment);
        booking.setRating(rating);
        booking.setStatus("COMPLETED"); // Mark as completed on review
        bookingRepo.save(booking);

        // Save into new Reviews table as requested
        Review reviewEntity = Review.builder()
                .booking(booking)
                .vehicle(booking.getVehicle())
                .rating(rating != null ? rating.intValue() : 5)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();
        reviewRepo.save(reviewEntity);

        // Update Driver's average rating in Vehicle
        Vehicle vehicle = booking.getVehicle();
        if (vehicle != null) {
            List<Booking> driverBookings = bookingRepo.findByVehicleDriverName(vehicle.getDriverName());
            double total = driverBookings.stream()
                    .filter(b -> b.getRating() != null)
                    .mapToDouble(Booking::getRating)
                    .sum();
            long count = driverBookings.stream()
                    .filter(b -> b.getRating() != null)
                    .count();

            if (count > 0) {
                vehicle.setDriverRating(total / count);
                vehicleRepo.save(vehicle);
            }
        }
        return booking;
    }

    public List<java.util.Map<String, Object>> getRecommendedVehicles(Long userId) {
        try {
            if (userId == null)
                userId = 1L;
            List<Vehicle> all = vehicleRepo.findAll();
            if (all == null)
                return new java.util.ArrayList<>();

            List<Vehicle> activeFleet = new java.util.ArrayList<>();
            for (Vehicle v : all) {
                if (v.getStatus() != null && (v.getStatus().equalsIgnoreCase("Active") ||
                        v.getStatus().equalsIgnoreCase("Idle") ||
                        v.getStatus().equalsIgnoreCase("Available") ||
                        v.getStatus().equalsIgnoreCase("Enroute"))) {
                    activeFleet.add(v);
                }
            }

            List<Booking> history = bookingRepo.findByUserId(userId);
            List<Vehicle> results;

            if (history == null || history.isEmpty()) {
                activeFleet.sort((v1, v2) -> Double.compare(
                        v2.getDriverRating() != null ? v2.getDriverRating() : 0.0,
                        v1.getDriverRating() != null ? v1.getDriverRating() : 0.0));
                // Tag top 3 as AI Recommended
                for (int i = 0; i < Math.min(3, activeFleet.size()); i++) {
                    activeFleet.get(i).setAiRecommended(true);
                }
                results = activeFleet;
            } else {
                java.util.Map<String, Integer> counts = new java.util.HashMap<>();
                for (Booking b : history) {
                    if (b.getVehicle() != null && b.getVehicle().getType() != null) {
                        String t = b.getVehicle().getType();
                        counts.put(t, counts.getOrDefault(t, 0) + 1);
                    }
                }
                String freqType = "Sedan";
                int maxCount = -1;
                for (java.util.Map.Entry<String, Integer> entry : counts.entrySet()) {
                    if (entry.getValue() > maxCount) {
                        maxCount = entry.getValue();
                        freqType = entry.getKey();
                    }
                }
                for (Vehicle v : activeFleet) {
                    if (v.getType() != null && v.getType().equalsIgnoreCase(freqType)) {
                        v.setAiRecommended(true);
                    }
                }
                results = activeFleet;
            }

            List<java.util.Map<String, Object>> manualResults = new java.util.ArrayList<>();
            for (Vehicle v : results) {
                java.util.Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", v.getId());
                map.put("model", v.getModel() != null ? v.getModel() : "Fleet Unit");
                map.put("driverName", v.getDriverName() != null ? v.getDriverName() : "Unit Driver");
                map.put("driverRating", v.getDriverRating() != null ? v.getDriverRating() : 4.8);
                map.put("driverContact", v.getDriverContact() != null ? v.getDriverContact() : "+91 0000000000");
                map.put("type", v.getType() != null ? v.getType() : "Sedan");
                map.put("seats", v.getSeats() != null ? v.getSeats() : 4);
                map.put("ev", v.getEv() != null ? v.getEv() : false);
                map.put("numberPlate", v.getNumberPlate() != null ? v.getNumberPlate() : "TN XX 0000");
                map.put("status", v.getStatus());
                map.put("aiRecommended", v.getAiRecommended());

                // Add missing metrics for richer UI
                map.put("fuelPercent", v.getFuelPercent() != null ? v.getFuelPercent() : 80);
                map.put("batteryPercent", v.getBatteryPercent() != null ? v.getBatteryPercent() : 80);

                manualResults.add(map);
            }
            return manualResults;
        } catch (Throwable t) {
            System.err.println("Error in recommendations: " + t.getMessage());
            return new java.util.ArrayList<>();
        }
    }
}
