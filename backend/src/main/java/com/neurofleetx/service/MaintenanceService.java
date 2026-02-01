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
            // Logic: Predict date based on odometer vs interval
            double remainingKm = SERVICE_INTERVAL_KM - (v.getOdometer() % SERVICE_INTERVAL_KM);
            
            // Simulating a prediction: If health is low, bring date closer
            if (v.getEngineHealth() < 50 || v.getTireWear() > 70) {
                v.setNextMaintenanceDate(LocalDateTime.now().plusDays(2));
            } else if (v.getNextMaintenanceDate() == null) {
                v.setNextMaintenanceDate(LocalDateTime.now().plusMonths(3));
            }
            
            // Alert Check (Logic moved to Manager Dashboard via Status)
            if (v.getEngineHealth() < 30 || v.getTireWear() > 80 || v.getBatteryHealth() < 30) {
                if (!"Maintenance".equalsIgnoreCase(v.getStatus())) {
                    // Critical Alert Level
                    System.out.println("🚨 CRITICAL: Vehicle " + v.getId() + " requires urgent maintenance!");
                }
            }
            
            vehicleRepo.save(v);
        }
    }

    public void resetHealth(Long vehicleId) {
        vehicleRepo.findById(vehicleId).ifPresent(v -> {
            v.setEngineHealth(100.0);
            v.setTireWear(0.0);
            v.setBatteryHealth(100.0);
            v.setTirePressure(32.0);
            v.setStatus("Active");
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
