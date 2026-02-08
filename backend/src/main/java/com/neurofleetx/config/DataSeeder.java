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
import java.util.Arrays;
import java.util.List;
import java.util.Random;

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
        seedUsers();
        seedVehicles();
        ensureTestDriverHasVehicle();
        seedBookings();
    }

    private void seedUsers() {
        // 1. Admin (Force Update)
        User admin = userRepo.findByEmail("admin@gmail.com").orElse(new User());
        admin.setName("System Admin");
        admin.setEmail("admin@gmail.com");
        admin.setPassword(passwordEncoder.encode("admin@123"));
        admin.setRole("ADMIN");
        userRepo.save(admin);
        System.out.println("✅ Seeded/Updated Admin User (admin@gmail.com)");

        // 2. Manager (Force Update)
        User manager = userRepo.findByEmail("manager@neurofleetx.com").orElse(new User());
        manager.setName("Operations Manager");
        manager.setEmail("manager@neurofleetx.com");
        manager.setPassword(passwordEncoder.encode("manager123"));
        manager.setRole("MANAGER");
        userRepo.save(manager);

        // 3. Customers (Force Update first one for testing)
        String[] customerNames = { "Alice Johnson", "Bob Smith", "Charlie Davis", "Diana Prince", "Ethan Hunt" };
        for (int i = 0; i < customerNames.length; i++) {
            String email = "customer" + (i + 1) + "@gmail.com";
            User cust = userRepo.findByEmail(email).orElse(new User());
            cust.setName(customerNames[i]);
            cust.setEmail(email);
            cust.setPassword(passwordEncoder.encode("password"));
            cust.setRole("CUSTOMER");
            userRepo.save(cust);
        }

        // 4. Drivers (Force Update first one for testing)
        String[] driverNames = { "Ramesh Driver", "Surendra Kumar", "Vikram Singh", "Priya Rajan", "Mohammed Ali" };
        for (int i = 0; i < driverNames.length; i++) {
            String email = "driver" + (i + 1) + "@gmail.com";
            User driver = userRepo.findByEmail(email).orElse(new User());
            driver.setName(driverNames[i]);
            driver.setEmail(email);
            driver.setPassword(passwordEncoder.encode("driver123"));
            driver.setRole("DRIVER");
            userRepo.save(driver);
        }
        System.out.println("✅ Seeded/Updated All Users (Managers, Customers, Drivers)");
    }

    private void seedVehicles() {
        // Diverse Fleet: EVs, SUVs, Sedans. Some with critical health for Manager
        // Alerts.
        saveVehicle(1L, "Ramesh Driver", "+91 9876543210", 4.8, "Tata Nexon EV", "TN 01 AB 1234", 4, "Active", 13.0827,
                80.2707, 85, "SUV", 95.0, 10.0, 98.0);
        saveVehicle(2L, "Surendra Kumar", "+91 9123456780", 4.5, "Mahindra XUV400", "TN 09 XY 5678", 6, "Enroute",
                12.9716, 80.2184, 60, "Luxury", 88.0, 15.0, 90.0);
        saveVehicle(3L, "Vikram Singh", "+91 8877665544", 4.2, "Hyundai Kona", "TN 11 ZZ 9988", 4, "Active", 13.0500,
                80.2000, 45, "SUV", 25.0, 85.0, 40.0); // Critical: Engine < 30, Tire > 80
        saveVehicle(4L, "Priya Rajan", "+91 7766554433", 4.9, "MG ZS EV", "TN 22 AA 1122", 4, "Active", 13.1000,
                80.2500, 90, "SUV", 92.0, 5.0, 95.0);
        saveVehicle(5L, "Mohammed Ali", "+91 6655443322", 4.7, "Tata Tigor EV", "TN 33 BB 3344", 4, "Enroute", 12.9000,
                80.1500, 55, "Sedan", 80.0, 20.0, 85.0);
        saveVehicle(6L, "Unassigned", "+91 0000000000", 0.0, "Ola S1 Pro", "TN 44 CC 5566", 2, "Active", 13.0100,
                80.2100, 100, "Bike", 99.0, 1.0, 100.0);
        saveVehicle(7L, "Unassigned", "+91 0000000000", 0.0, "Ather 450X", "TN 55 DD 7788", 2, "Maintenance", 13.0200,
                80.2200, 10, "Bike", 20.0, 50.0, 25.0); // Critical: Battery < 30
        saveVehicle(8L, "Unassigned", "+91 0000000000", 0.0, "Toyota Innova", "TN 66 EE 9900", 7, "Offline", 13.0300,
                80.2300, 0, "Luxury", 70.0, 30.0, 75.0); // Hybrid/Fuel
        System.out.println("✅ Seeded 8 Realistic Vehicles");
    }

    private void saveVehicle(Long id, String driverName, String contact, Double rating, String model, String plate,
            int seats, String status, double lat, double lng, int bat, String type, Double engH, Double tireW,
            Double batH) {
        // Find by Number Plate (Natural Key) to avoid ID generation conflicts
        Vehicle v = vehicleRepo.findAll().stream()
                .filter(vehicle -> plate.equalsIgnoreCase(vehicle.getNumberPlate()))
                .findFirst()
                .orElse(new Vehicle());

        // Don't set ID manually if new, let DB generate it.
        // v.setId(id);

        v.setDriverName(driverName);
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
        v.setEngineHealth(engH);
        v.setTireWear(tireW);
        v.setBatteryHealth(batH);

        if (v.getOdometer() == null)
            v.setOdometer(1200.0 + (id * 100)); // Use 'id' just for seed math
        if (v.getNextMaintenanceDate() == null)
            v.setNextMaintenanceDate(LocalDateTime.now().plusMonths(3));

        v.setLastUpdate(LocalDateTime.now());
        Vehicle savedVehicle = vehicleRepo.save(v);

        // Link Vehicle to User (Driver)
        java.util.Optional<User> driverOpt = userRepo.findByName(driverName);
        if (driverOpt.isPresent()) {
            User driver = driverOpt.get();
            driver.setVehicleId(savedVehicle.getId());
            userRepo.save(driver);
            System.out.println("🔗 Linked Vehicle " + plate + " to Driver User: " + driverName);
        }
    }

    private void ensureTestDriverHasVehicle() {
        java.util.Optional<User> testDriver = userRepo.findByName("testdriver01");
        if (testDriver.isPresent()) {
            User u = testDriver.get();
            if (u.getVehicleId() == null) {
                System.out.println("⚠️ Found 'testdriver01' without a vehicle. Assigning one now...");
                saveVehicle(999L, "testdriver01", u.getPhone() != null ? u.getPhone() : "+91 9876543210", 5.0,
                        "Tesla Model 3", "TN 99 TEST 01", 5, "Active", 11.0168, 76.9558, 100, "Sedan", 100.0, 0.0,
                        100.0);
            }
        }
    }

    private void seedBookings() {
        if (bookingRepo.count() > 30) {
            System.out.println("ℹ️ Bookings already seeded, skipping bulk insert.");
            return;
        }

        List<Vehicle> vehicles = vehicleRepo.findAll();
        List<User> users = userRepo.findAll();
        Random rand = new Random();

        // 1. Guaranteed "Trips Today" (Completed) - 8 Bookings
        for (int i = 0; i < 8; i++) {
            com.neurofleetx.model.Booking b = new com.neurofleetx.model.Booking();
            b.setStartLocation("Location A" + i);
            b.setEndLocation("Location B" + i);
            b.setAmount(150.0 + rand.nextInt(300));
            b.setStatus("COMPLETED");
            b.setVehicle(vehicles.get(rand.nextInt(vehicles.size())));
            b.setUser(users.get(rand.nextInt(users.size())));

            // Explicitly Today
            int hour = 8 + rand.nextInt(10); // 8 AM to 6 PM
            LocalDateTime time = LocalDateTime.now().withHour(hour).withMinute(rand.nextInt(59));
            if (time.isAfter(LocalDateTime.now()))
                time = time.minusHours(4); // Ensure past time today

            b.setStartTime(time.minusMinutes(45));
            b.setEndTime(time);
            bookingRepo.save(b);
        }

        // 2. Guaranteed "Active Routes" (Enroute + Vehicle Update)
        for (int i = 0; i < 5; i++) {
            Vehicle v = vehicles.get(i);
            if (!"Maintenance".equalsIgnoreCase(v.getStatus())) {
                v.setStatus("ENROUTE");
                vehicleRepo.save(v);

                com.neurofleetx.model.Booking b = new com.neurofleetx.model.Booking();
                b.setStartLocation("Airport Terminal " + (i + 1));
                b.setEndLocation("City Hotel " + (i + 1));
                b.setAmount(550.0);
                b.setStatus("ENROUTE");
                b.setVehicle(v);
                b.setUser(users.get(rand.nextInt(users.size())));
                b.setStartTime(LocalDateTime.now().minusMinutes(15 + rand.nextInt(30)));
                bookingRepo.save(b);
            }
        }

        // 3. Past Bookings (Yesterday/Week) for Charts
        for (int i = 0; i < 20; i++) {
            com.neurofleetx.model.Booking b = new com.neurofleetx.model.Booking();
            b.setStartLocation("Old Loc " + i);
            b.setEndLocation("Old Dest " + i);
            b.setAmount(100.0 + rand.nextInt(400));
            b.setStatus("COMPLETED");
            b.setVehicle(vehicles.get(rand.nextInt(vehicles.size())));
            b.setUser(users.get(rand.nextInt(users.size())));

            b.setStartTime(LocalDateTime.now().minusDays(1 + rand.nextInt(5)).withHour(rand.nextInt(23)));
            b.setEndTime(b.getStartTime().plusMinutes(30));
            bookingRepo.save(b);
        }

        System.out.println("✅ Seeded Guaranteed 'Today' stats + History");
    }
}
