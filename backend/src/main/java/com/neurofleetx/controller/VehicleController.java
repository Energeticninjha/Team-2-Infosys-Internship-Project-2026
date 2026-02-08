package com.neurofleetx.controller;

import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.User;
import com.neurofleetx.model.dto.VehicleLive;
import com.neurofleetx.repo.VehicleRepository;
import com.neurofleetx.service.MaintenanceService;
import com.neurofleetx.service.VehicleSimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/vehicles")
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001" })
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepo;

    @Autowired
    private MaintenanceService maintenanceService;

    @Autowired
    private VehicleSimulationService simulationService;

    @Autowired
    private com.neurofleetx.service.BookingService bookingService;

    @Autowired
    private com.neurofleetx.repo.UserRepository userRepo;

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepo.findAll();
    }

    @PostMapping
    public Vehicle create(@RequestBody Vehicle vehicle) {
        // Enforce One Active Vehicle Rule:
        // Set all other vehicles for this driver to "Inactive" (or archived)
        if (vehicle.getDriverName() != null) {
            List<Vehicle> existing = vehicleRepo.findAll().stream()
                    .filter(v -> v.getDriverName().equalsIgnoreCase(vehicle.getDriverName()))
                    .toList();
            for (Vehicle v : existing) {
                v.setStatus("Inactive");
                vehicleRepo.save(v);
            }
        }
        // New vehicles are always "Pending" initially, unless admin overrides
        if (vehicle.getStatus() == null || vehicle.getStatus().isEmpty()) {
            vehicle.setStatus("Pending");
        }
        vehicle.setDocumentStatus("Pending");
        vehicle.setDocumentStatus("Pending");
        Vehicle savedVehicle = vehicleRepo.save(vehicle);

        // Sync Driver Photo to User Profile
        if (savedVehicle.getDriverEmail() != null && !savedVehicle.getDriverEmail().isEmpty()) {
            userRepo.findByEmail(savedVehicle.getDriverEmail()).ifPresent(user -> {
                boolean updated = false;
                if (savedVehicle.getDriverPhotoUrl() != null && !savedVehicle.getDriverPhotoUrl().isEmpty()) {
                    user.setProfilePhotoUrl(savedVehicle.getDriverPhotoUrl());
                    updated = true;
                }
                if (savedVehicle.getDriverContact() != null && !savedVehicle.getDriverContact().isEmpty()) {
                    user.setPhone(savedVehicle.getDriverContact());
                    updated = true;
                }
                if (updated)
                    userRepo.save(user);
            });
        }

        return savedVehicle;
    }

    @GetMapping("/{id}")
    public Vehicle getVehicle(@PathVariable Long id) {
        return vehicleRepo.findById(id).orElseThrow(() -> new RuntimeException("Vehicle not found"));
    }

    @PutMapping("/{id}")
    public Vehicle updateVehicle(@PathVariable Long id, @RequestBody Vehicle vehicleUpdates) {
        return vehicleRepo.findById(id).map(vehicle -> {
            // Update fields that are provided
            if (vehicleUpdates.getStatus() != null) {
                vehicle.setStatus(vehicleUpdates.getStatus());

                // SYNC Driver Online Status with Vehicle Status
                if (vehicle.getDriverEmail() != null) {
                    userRepo.findByEmail(vehicle.getDriverEmail()).ifPresent(user -> {
                        if ("Inactive".equalsIgnoreCase(vehicleUpdates.getStatus())) {
                            user.setIsOnline(false);
                        } else {
                            user.setIsOnline(true);
                        }
                        userRepo.save(user);
                    });
                }
            }

            if (vehicleUpdates.getDocumentStatus() != null)
                vehicle.setDocumentStatus(vehicleUpdates.getDocumentStatus());
            if (vehicleUpdates.getModel() != null)
                vehicle.setModel(vehicleUpdates.getModel());
            if (vehicleUpdates.getNumberPlate() != null)
                vehicle.setNumberPlate(vehicleUpdates.getNumberPlate());
            if (vehicleUpdates.getDriverName() != null)
                vehicle.setDriverName(vehicleUpdates.getDriverName());
            if (vehicleUpdates.getDriverContact() != null)
                vehicle.setDriverContact(vehicleUpdates.getDriverContact());
            if (vehicleUpdates.getDriverRating() != null)
                vehicle.setDriverRating(vehicleUpdates.getDriverRating());
            if (vehicleUpdates.getDriverPhotoUrl() != null)
                vehicle.setDriverPhotoUrl(vehicleUpdates.getDriverPhotoUrl());
            if (vehicleUpdates.getDriverLicenseUrl() != null)
                vehicle.setDriverLicenseUrl(vehicleUpdates.getDriverLicenseUrl());
            if (vehicleUpdates.getIdentificationUrl() != null)
                vehicle.setIdentificationUrl(vehicleUpdates.getIdentificationUrl());
            if (vehicleUpdates.getVehiclePhotoUrl() != null)
                vehicle.setVehiclePhotoUrl(vehicleUpdates.getVehiclePhotoUrl());
            if (vehicleUpdates.getVehiclePhotosList() != null)
                vehicle.setVehiclePhotosList(vehicleUpdates.getVehiclePhotosList());
            if (vehicleUpdates.getType() != null)
                vehicle.setType(vehicleUpdates.getType());
            if (vehicleUpdates.getSeats() != null)
                vehicle.setSeats(vehicleUpdates.getSeats());
            if (vehicleUpdates.getLatitude() != null)
                vehicle.setLatitude(vehicleUpdates.getLatitude());
            if (vehicleUpdates.getLongitude() != null)
                vehicle.setLongitude(vehicleUpdates.getLongitude());

            Vehicle saved = vehicleRepo.save(vehicle);

            // Sync Photo and Phone on Update
            if (saved.getDriverEmail() != null) {
                userRepo.findByEmail(saved.getDriverEmail()).ifPresent(u -> {
                    boolean updated = false;
                    if (saved.getDriverPhotoUrl() != null) {
                        u.setProfilePhotoUrl(saved.getDriverPhotoUrl());
                        updated = true;
                    }
                    if (saved.getDriverContact() != null) {
                        u.setPhone(saved.getDriverContact());
                        updated = true;
                    }
                    if (updated)
                        userRepo.save(u);
                });
            }

            return saved;
        }).orElseThrow(() -> new RuntimeException("Vehicle not found"));
    }

    @GetMapping("/live")
    public List<VehicleLive> getLiveVehicles() {
        List<Vehicle> vehicles = vehicleRepo.findByStatusIn(Arrays.asList("Active", "Enroute"));

        List<VehicleLive> liveVehicles = new ArrayList<>();
        Random rand = new Random();

        for (Vehicle vehicle : vehicles) {

            // 1. Check & Apply Simulation Update
            simulationService.updateVehiclePosition(vehicle);

            // 2. Fallback Jitter if no active trip simulation
            // (We assume if simulationService updated it, it has new coords)
            // But if it didn't (not in trip), we add small noise to look "live"

            double lat = vehicle.getLatitude();
            double lng = vehicle.getLongitude();

            // Jitter only if strictly at a standstill default?
            // Or always jitter slightly to show "life"?
            // Let's jitter slightly.
            // lat += (rand.nextDouble() - 0.5) * 0.0001;
            // lng += (rand.nextDouble() - 0.5) * 0.0001;

            VehicleLive live = VehicleLive.builder()
                    .id(vehicle.getId())
                    .driverName(vehicle.getDriverName())
                    .model(vehicle.getModel())
                    .status(vehicle.getStatus())
                    .latitude(lat)
                    .longitude(lng)
                    .speed(20 + rand.nextInt(40))
                    .eta((5 + rand.nextInt(20)) + " mins")
                    .numberPlate(vehicle.getNumberPlate())
                    .driverContact(vehicle.getDriverContact())
                    .driverRating(vehicle.getDriverRating())
                    .driverPhotoUrl(vehicle.getDriverPhotoUrl())
                    .seats(vehicle.getSeats() != null ? vehicle.getSeats() : 4) // Default to 4 if null
                    .build();

            liveVehicles.add(live);
        }

        return liveVehicles;
    }

    @GetMapping("/driver/{driverName}")
    public ResponseEntity<Vehicle> getVehicleByDriver(@PathVariable String driverName) {
        // REMOVED HEARTBEAT LOGIC that was forcing drivers to be online
        return vehicleRepo.findAll().stream()
                .filter(v -> driverName.equalsIgnoreCase(v.getDriverName()))
                .findFirst()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/health")
    public Map<String, Object> getVehicleHealth(@PathVariable Long id) {
        return maintenanceService.getVehicleHealthStats(id);
    }

    @PutMapping("/maintenance/reset/{id}")
    public ResponseEntity<String> resetVehicleHealth(@PathVariable Long id) {
        maintenanceService.resetHealth(id);
        return ResponseEntity.ok("Vehicle health reset successfully");
    }
}
