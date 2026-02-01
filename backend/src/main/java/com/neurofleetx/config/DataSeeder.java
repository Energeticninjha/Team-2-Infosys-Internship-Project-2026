package com.neurofleetx.config;

import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepo;
    
    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private com.neurofleetx.repo.BookingRepository bookingRepo;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Data Purge removed for persistence. Admin is seeded/updated below.
        seedUsers();
        seedVehicles();
    }
    
    private void seedUsers() {
        // Force update Admin password if exists, or create if missing
        User admin = userRepo.findByEmail("admin@gmail.com").orElse(new User());
        admin.setName("System Admin");
        admin.setEmail("admin@gmail.com");
        admin.setPassword(passwordEncoder.encode("admin@123"));
        admin.setRole("ADMIN");
        userRepo.save(admin);
        System.out.println("✅ Seeded/Updated Admin User (admin@gmail.com)");

        if (userRepo.count() <= 1) { // If only admin exists, seed demo user
            User user = new User();
            user.setName("Demo User");
            user.setEmail("demo@neurofleetx.com");
            user.setPassword(passwordEncoder.encode("password"));
            user.setRole("CUSTOMER");
            userRepo.save(user);
            System.out.println("✅ Seeded Customer User");
        }
    }
    
    // Using Setters to avoid Builder issues
    private void seedVehicles() {
        // ALWAYS SEED/UPDATE to ensure new fields are applied
        saveVehicle(1L, "Ramesh Driver", "+91 9876543210", 4.8, "Tata Nexon EV", "TN 01 AB 1234", 4, "Active", 13.0827, 80.2707, 85, "SUV");
        saveVehicle(2L, "Surendra", "+91 9123456780", 4.5, "Mahindra XUV400", "TN 09 XY 5678", 6, "Active", 12.9716, 80.2184, 60, "Luxury");
    }

    private void saveVehicle(Long id, String driver, String contact, Double rating, String model, String plate, int seats, String status, double lat, double lng, int bat, String type) {
        Vehicle v = vehicleRepo.findById(id).orElse(new Vehicle());
        v.setId(id); // Ensure ID matches
        v.setDriverName(driver);
        v.setDriverContact(contact);
        v.setDriverRating(rating);
        v.setModel(model);
        v.setNumberPlate(plate);
        v.setSeats(seats);
        v.setStatus(status);
        v.setLatitude(lat);
        v.setLongitude(lng);
        v.setBatteryPercent(bat);
        v.setType(type);
        v.setLastUpdate(LocalDateTime.now());
        vehicleRepo.save(v);
        System.out.println("✅ Seeded/Updated Vehicle " + id);
    }
}
