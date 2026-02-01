package com.neurofleetx.controller;

import com.neurofleetx.model.Vehicle;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) 
public class VehicleController {
    
    @Autowired
    private VehicleRepository vehicleRepo;
    
    @Autowired
    private MaintenanceService maintenanceService;
    
    @Autowired
    private VehicleSimulationService simulationService;

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepo.findAll();
    }

    @PostMapping
    public Vehicle create(@RequestBody Vehicle vehicle) {
        return vehicleRepo.save(vehicle);
    }

    @GetMapping("/{id}")
    public Vehicle getVehicle(@PathVariable Long id) {
        return vehicleRepo.findById(id).orElseThrow(() -> new RuntimeException("Vehicle not found"));
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
                .seats(vehicle.getSeats() != null ? vehicle.getSeats() : 4) // Default to 4 if null
                .build();
            
            liveVehicles.add(live);
        }
        
        return liveVehicles;
    }

    @GetMapping("/driver/{driverName}")
    public ResponseEntity<Vehicle> getVehicleByDriver(@PathVariable String driverName) {
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
