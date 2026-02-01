package com.neurofleetx.service;

import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class VehicleSimulationService {

    @Autowired
    private VehicleRepository vehicleRepo;
    
    // Map<VehicleID, ActiveTripData>
    private final Map<Long, ActiveTrip> activeTrips = new ConcurrentHashMap<>();

    private static class ActiveTrip {
        List<double[]> path;
        LocalDateTime startTime;
        long totalDurationSeconds = 60; // Mock duration: 60 seconds per trip for demo
        
        public ActiveTrip(List<double[]> path) {
            this.path = path;
            this.startTime = LocalDateTime.now();
        }
    }

    public void startTrip(Long vehicleId, List<double[]> path) {
        activeTrips.put(vehicleId, new ActiveTrip(path));
    }

    // Called by Controller to get live position
    public void updateVehiclePosition(Vehicle vehicle) {
        if (!activeTrips.containsKey(vehicle.getId())) return;
        
        ActiveTrip trip = activeTrips.get(vehicle.getId());
        long secondsElapsed = Duration.between(trip.startTime, LocalDateTime.now()).getSeconds();
        
        if (secondsElapsed >= trip.totalDurationSeconds) {
            // Trip Over
            activeTrips.remove(vehicle.getId());
            return;
        }
        
        // Calculate progress
        double progress = (double) secondsElapsed / trip.totalDurationSeconds;
        int targetIndex = (int) (progress * (trip.path.size() - 1));
        
        if (targetIndex < trip.path.size()) {
            double[] coords = trip.path.get(targetIndex);
            vehicle.setLatitude(coords[0]);
            vehicle.setLongitude(coords[1]);
        }
    }
}
