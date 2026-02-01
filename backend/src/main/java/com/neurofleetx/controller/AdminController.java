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
        
        long activeTrips = allBookings.stream().filter(b -> "CONFIRMED".equals(b.getStatus()) || "ENROUTE".equals(b.getStatus())).count();
        double totalRevenue = allBookings.stream().filter(b -> "COMPLETED".equals(b.getStatus())).mapToDouble(b -> b.getAmount() != null ? b.getAmount() : 0.0).sum();
        long drivers = userRepo.findAll().stream().filter(u -> "DRIVER".equalsIgnoreCase(u.getRole())).count();

        kpi.put("totalVehicles", totalVehicles);
        kpi.put("totalUsers", totalUsers);
        kpi.put("activeTrips", activeTrips);
        kpi.put("revenueToday", totalRevenue);
        kpi.put("utilization", totalVehicles > 0 ? (double) activeTrips / totalVehicles * 100 : 0.0);
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
