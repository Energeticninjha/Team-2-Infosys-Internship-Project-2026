package com.neurofleetx.controller;

import com.neurofleetx.model.dto.RouteOption;
import com.neurofleetx.model.dto.RouteRequest;
import com.neurofleetx.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class FleetController {

    @Autowired
    private com.neurofleetx.repo.VehicleRepository vehicleRepo;

    @Autowired
    private com.neurofleetx.repo.BookingRepository bookingRepo;

    @Autowired
    private RouteService routeService;

    @PostMapping("/optimize-route")
    public List<RouteOption> optimizeRoute(@RequestBody RouteRequest request) {
        return routeService.calculateRoutes(request);
    }

    @GetMapping("/recommend-driver/{bookingId}")
    public List<com.neurofleetx.model.Vehicle> getRecommendedDriver(@PathVariable Long bookingId) {
        com.neurofleetx.model.Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        // Use hardcoded coordinates if trip has none (demo safety)
        double pickupLat = 13.0827; 
        double pickupLng = 80.2707;
        
        // In real app, we'd geocode startLocation or use stored lat/lng
        // For now, let's try to extract from booking if we had them, otherwise default
        
        List<com.neurofleetx.model.Vehicle> availableVehicles = vehicleRepo.findByStatusIn(List.of("AVAILABLE", "Active"));

        return availableVehicles.stream()
                .sorted((v1, v2) -> {
                    double d1 = calculateHaversine(pickupLat, pickupLng, v1.getLatitude(), v1.getLongitude());
                    double d2 = calculateHaversine(pickupLat, pickupLng, v2.getLatitude(), v2.getLongitude());
                    return Double.compare(d1, d2);
                })
                .collect(java.util.stream.Collectors.toList());
    }

    private double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
