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

    @Autowired
    private com.neurofleetx.service.TelemetryService telemetryService;

    @Autowired
    private com.neurofleetx.repo.AlertRepository alertRepo;

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
                    .filter(v -> vehicle.getDriverName().equalsIgnoreCase(v.getDriverName()))
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
                String oldStatus = vehicle.getStatus();
                vehicle.setStatus(vehicleUpdates.getStatus());

                // AUTO-FIX LOGIC:
                // If the vehicle was in "Maintenance" and is now being set to "Active" (or
                // related),
                // we trigger the health reset.
                if ("Maintenance".equalsIgnoreCase(oldStatus) &&
                        ("Active".equalsIgnoreCase(vehicleUpdates.getStatus())
                                || "Available".equalsIgnoreCase(vehicleUpdates.getStatus()))) {
                    // Apply health reset directly to the entity to avoid race condition/overwrite
                    vehicle.setEngineHealth(100.0);
                    vehicle.setTireWear(0.0);
                    vehicle.setBatteryHealth(100.0);
                    vehicle.setTirePressure(32.0);
                    vehicle.setFuelPercent(100);
                    vehicle.setNextMaintenanceDate(java.time.LocalDateTime.now().plusMonths(3));
                }

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

    @PutMapping("/maintenance/schedule/{id}")
    public ResponseEntity<String> scheduleMaintenance(@PathVariable Long id) {
        maintenanceService.scheduleMaintenance(id);
        return ResponseEntity.ok("Vehicle scheduled for maintenance");
    }

    @GetMapping("/telemetry/export")
    public ResponseEntity<String> exportTelemetryCSV() {
        List<Vehicle> vehicles = vehicleRepo.findAll();
        StringBuilder csv = new StringBuilder();

        // CSV Header
        csv.append(
                "Vehicle ID,Model,Number Plate,Driver Name,Status,Speed (km/h),Battery %,Fuel %,Odometer (km),Engine Health,Tire Wear,Battery Health,Tire Pressure,Latitude,Longitude,Last Update\n");

        // CSV Data
        for (Vehicle v : vehicles) {
            csv.append(v.getId()).append(",")
                    .append(v.getModel() != null ? v.getModel() : "N/A").append(",")
                    .append(v.getNumberPlate() != null ? v.getNumberPlate() : "N/A").append(",")
                    .append(v.getDriverName() != null ? v.getDriverName() : "N/A").append(",")
                    .append(v.getStatus() != null ? v.getStatus() : "N/A").append(",")
                    .append(v.getSpeed() != null ? v.getSpeed() : 0).append(",")
                    .append(v.getBatteryPercent() != null ? v.getBatteryPercent() : 0).append(",")
                    .append(v.getFuelPercent() != null ? v.getFuelPercent() : 0).append(",")
                    .append(v.getOdometer() != null ? v.getOdometer() : 0).append(",")
                    .append(v.getEngineHealth() != null ? v.getEngineHealth() : 100).append(",")
                    .append(v.getTireWear() != null ? v.getTireWear() : 0).append(",")
                    .append(v.getBatteryHealth() != null ? v.getBatteryHealth() : 100).append(",")
                    .append(v.getTirePressure() != null ? v.getTirePressure() : 32).append(",")
                    .append(v.getLatitude() != null ? v.getLatitude() : 0).append(",")
                    .append(v.getLongitude() != null ? v.getLongitude() : 0).append(",")
                    .append(v.getLastUpdate() != null ? v.getLastUpdate() : "N/A").append("\n");
        }

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=vehicle_telemetry.csv")
                .header("Content-Type", "text/csv")
                .body(csv.toString());
    }

    @GetMapping("/{id}/health-score")
    public ResponseEntity<Map<String, Object>> getHealthScore(@PathVariable Long id) {
        return vehicleRepo.findById(id).map(v -> {
            // Calculate overall health score (0-100)
            double engineScore = v.getEngineHealth() != null ? v.getEngineHealth() : 100;
            double batteryScore = v.getBatteryHealth() != null ? v.getBatteryHealth() : 100;
            double tireScore = v.getTireWear() != null ? (100 - v.getTireWear()) : 100;

            double overallScore = (engineScore + batteryScore + tireScore) / 3.0;

            Map<String, Object> result = new java.util.HashMap<>();
            result.put("vehicleId", v.getId());
            result.put("overallHealthScore", Math.round(overallScore * 10) / 10.0);
            result.put("engineHealth", engineScore);
            result.put("batteryHealth", batteryScore);
            result.put("tireHealth", tireScore);
            result.put("status", overallScore >= 70 ? "Good" : overallScore >= 40 ? "Fair" : "Critical");

            return ResponseEntity.ok(result);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/telemetry/history")
    public ResponseEntity<List<com.neurofleetx.model.TelemetryHistory>> getTelemetryHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "24") int hours) {
        List<com.neurofleetx.model.TelemetryHistory> history = telemetryService.getVehicleHistory(id, hours);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<com.neurofleetx.model.Alert>> getAllAlerts() {
        return ResponseEntity.ok(alertRepo.findByStatusOrderByCreatedAtDesc("ACTIVE"));
    }

    @GetMapping("/alerts/critical")
    public ResponseEntity<List<com.neurofleetx.model.Alert>> getCriticalAlerts() {
        return ResponseEntity.ok(alertRepo.findBySeverityAndStatusOrderByCreatedAtDesc("CRITICAL", "ACTIVE"));
    }

    @PutMapping("/alerts/{id}/acknowledge")
    public ResponseEntity<String> acknowledgeAlert(@PathVariable Long id) {
        return alertRepo.findById(id).map(alert -> {
            alert.setStatus("ACKNOWLEDGED");
            alert.setAcknowledgedAt(java.time.LocalDateTime.now());
            alertRepo.save(alert);
            return ResponseEntity.ok("Alert acknowledged");
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/alerts/{id}/resolve")
    public ResponseEntity<String> resolveAlert(@PathVariable Long id) {
        return alertRepo.findById(id).map(alert -> {
            alert.setStatus("RESOLVED");
            alert.setResolvedAt(java.time.LocalDateTime.now());
            alertRepo.save(alert);
            return ResponseEntity.ok("Alert resolved");
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/utilization")
    public ResponseEntity<Map<String, Object>> getFleetUtilization() {
        return ResponseEntity.ok(telemetryService.getFleetUtilization());
    }

    @GetMapping("/health/trends")
    public ResponseEntity<Map<String, Object>> getFleetHealthTrends(
            @RequestParam(defaultValue = "7") int days) {
        return ResponseEntity.ok(telemetryService.getFleetHealthTrends(days));
    }
}
