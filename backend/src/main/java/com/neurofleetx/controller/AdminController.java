package com.neurofleetx.controller;

import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
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
            .filter(b -> "COMPLETED".equals(b.getStatus()) && b.getEndTime() != null && b.getEndTime().toLocalDate().equals(today))
            .mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0)
            .sum();

        // Active Trips (Overall live trips)
        long activeTrips = allBookings.stream().filter(b -> "ENROUTE".equals(b.getStatus()) || "CONFIRMED".equals(b.getStatus())).count();
        
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

    @DeleteMapping("/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        userRepo.deleteById(id);
    }
}
