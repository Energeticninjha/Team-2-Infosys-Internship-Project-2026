package com.neurofleetx.service;

import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MaintenanceService {

    @Autowired
    private VehicleRepository vehicleRepo;

    private static final double SERVICE_INTERVAL_KM = 5000.0;

    @Scheduled(fixedRate = 60000) // Every minute for demo
    public void predictMaintenance() {
        List<Vehicle> vehicles = vehicleRepo.findAll();
        for (Vehicle v : vehicles) {
            // Multi-Factor Predictive Algorithm
            double engineHealth = v.getEngineHealth() != null ? v.getEngineHealth() : 100.0;
            double tireWear = v.getTireWear() != null ? v.getTireWear() : 0.0;
            double batteryHealth = v.getBatteryHealth() != null ? v.getBatteryHealth() : 100.0;
            double odometer = v.getOdometer() != null ? v.getOdometer() : 0.0;

            // Calculate days until maintenance based on multiple factors
            int daysUntilMaintenance = calculateMaintenanceDays(engineHealth, tireWear, batteryHealth, odometer);

            // Update next maintenance date
            v.setNextMaintenanceDate(LocalDateTime.now().plusDays(daysUntilMaintenance));

            // Alert Check (Logic moved to Manager Dashboard via Status)
            if (engineHealth < 30 || tireWear > 80 || batteryHealth < 30) {
                if (!"Maintenance".equalsIgnoreCase(v.getStatus())) {
                    // Critical Alert Level
                    System.out.println("🚨 CRITICAL: Vehicle " + v.getId() + " requires urgent maintenance!");
                }
            }

            vehicleRepo.save(v);
        }
    }

    private int calculateMaintenanceDays(double engineHealth, double tireWear, double batteryHealth, double odometer) {
        // Start with base interval (90 days / 3 months)
        int baseDays = 90;

        // Factor 1: Engine Health
        int engineDays = baseDays;
        if (engineHealth < 30) {
            engineDays = 2; // Critical - 2 days
        } else if (engineHealth < 40) {
            engineDays = 5; // Very Low - 5 days
        } else if (engineHealth < 50) {
            engineDays = 10; // Low - 10 days
        } else if (engineHealth < 60) {
            engineDays = 20; // Moderate - 20 days
        } else if (engineHealth < 70) {
            engineDays = 45; // Fair - 45 days
        }

        // Factor 2: Tire Wear
        int tireDays = baseDays;
        if (tireWear > 80) {
            tireDays = 2; // Critical - 2 days
        } else if (tireWear > 75) {
            tireDays = 5; // Very High - 5 days
        } else if (tireWear > 70) {
            tireDays = 10; // High - 10 days
        } else if (tireWear > 60) {
            tireDays = 20; // Moderate - 20 days
        } else if (tireWear > 50) {
            tireDays = 45; // Fair - 45 days
        }

        // Factor 3: Battery Health
        int batteryDays = baseDays;
        if (batteryHealth < 30) {
            batteryDays = 3; // Critical - 3 days
        } else if (batteryHealth < 40) {
            batteryDays = 7; // Very Low - 7 days
        } else if (batteryHealth < 50) {
            batteryDays = 14; // Low - 14 days
        } else if (batteryHealth < 60) {
            batteryDays = 30; // Moderate - 30 days
        } else if (batteryHealth < 70) {
            batteryDays = 60; // Fair - 60 days
        }

        // Factor 4: Odometer-based prediction
        int odometerDays = baseDays;
        double remainingKm = SERVICE_INTERVAL_KM - (odometer % SERVICE_INTERVAL_KM);
        if (remainingKm < 500) {
            odometerDays = 7; // Less than 500km remaining
        } else if (remainingKm < 1000) {
            odometerDays = 14; // Less than 1000km remaining
        } else if (remainingKm < 2000) {
            odometerDays = 30; // Less than 2000km remaining
        }

        // Return the MINIMUM (most urgent) prediction
        return Math.min(Math.min(engineDays, tireDays), Math.min(batteryDays, odometerDays));
    }

    public void scheduleMaintenance(Long vehicleId) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            v.setStatus("Maintenance");
            vehicleRepo.save(v);
            System.out.println("🗓️ Vehicle " + vehicleId + " scheduled for maintenance.");
        });
    }

    public void resetHealth(Long vehicleId) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            v.setEngineHealth(100.0);
            v.setTireWear(0.0);
            v.setBatteryHealth(100.0);
            v.setTirePressure(32.0);
            v.setFuelPercent(100);

            // Only set to Active if not already Inactive/Offline
            if (!"Inactive".equalsIgnoreCase(v.getStatus())) {
                v.setStatus("Active");
            }

            v.setNextMaintenanceDate(LocalDateTime.now().plusMonths(3));
            vehicleRepo.save(v);
            System.out.println("🛠️ Vehicle " + vehicleId + " health reset completed.");
        });
    }

    public java.util.Map<String, Object> getVehicleHealthStats(Long id) {
        Vehicle v = vehicleRepo.findById(id).orElseThrow(() -> new RuntimeException("Vehicle not found"));
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("engine", v.getEngineHealth());
        stats.put("tires", v.getTireWear());
        stats.put("battery", v.getBatteryHealth());
        stats.put("odometer", v.getOdometer());
        stats.put("nextMaintenance", v.getNextMaintenanceDate());
        return stats;
    }
}
