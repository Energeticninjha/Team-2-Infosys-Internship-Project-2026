package com.neurofleetx.service;

import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class MaintenanceService {

    @Autowired
    private VehicleRepository vehicleRepo;

    // Module 4: Predictive Maintenance & Health Analytics
    public Map<String, Object> predictMaintenance(Long vehicleId) {
        Vehicle vehicle = vehicleRepo.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        Map<String, Object> healthReport = new HashMap<>();
        Random rand = new Random();

        // Simulate sensor data
        int engineTemp = 80 + rand.nextInt(30); // 80-110 C
        int tirePressure = 30 + rand.nextInt(10); // 30-40 PSI
        int brakeWear = rand.nextInt(100); // 0-100%

        healthReport.put("vehicleId", vehicle.getId());
        healthReport.put("model", vehicle.getModel());
        
        Map<String, String> metrics = new HashMap<>();
        metrics.put("Engine Temperature", engineTemp + "°C");
        metrics.put("Tire Pressure", tirePressure + " PSI");
        metrics.put("Brake Wear", brakeWear + "%");
        metrics.put("Battery Health", "94%");
        
        healthReport.put("metrics", metrics);

        // Predictive Logic
        String prediction = "Healthy";
        String action = "None";

        if (engineTemp > 100) {
            prediction = "Critical";
            action = "Check Coolant System Immediately";
        } else if (brakeWear > 80) {
            prediction = "Warning";
            action = "Replace Brake Pads soon";
        } else if (vehicle.getBatteryPercent() != null && vehicle.getBatteryPercent() < 20) {
            prediction = "Low Battery";
            action = "Charge Vehicle";
        }

        healthReport.put("status", prediction);
        healthReport.put("recommendedAction", action);
        
        return healthReport;
    }
}
