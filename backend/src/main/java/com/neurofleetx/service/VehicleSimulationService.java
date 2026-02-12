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
        LocalDateTime scheduledStartTime; // New
        long totalDurationSeconds = 60;

        public ActiveTrip(List<double[]> path, LocalDateTime scheduledStartTime) {
            this.path = path;
            this.startTime = LocalDateTime.now();
            this.scheduledStartTime = scheduledStartTime != null ? scheduledStartTime : LocalDateTime.now();
        }
    }

    public void startTrip(Long vehicleId, List<double[]> path, LocalDateTime scheduledStartTime) {
        activeTrips.put(vehicleId, new ActiveTrip(path, scheduledStartTime));
    }

    // Called by Controller to get live position
    public void updateVehiclePosition(Vehicle vehicle) {
        if (!activeTrips.containsKey(vehicle.getId()))
            return;

        ActiveTrip trip = activeTrips.get(vehicle.getId());

        // If not yet time to start, don't move
        if (LocalDateTime.now().isBefore(trip.scheduledStartTime)) {
            return;
        }

        // Use scheduledStartTime as the reference for progress if it was in the past,
        // or NOW if it just started.
        // Actually, let's just use Duration from scheduledStartTime.
        long secondsElapsed = Duration.between(trip.scheduledStartTime, LocalDateTime.now()).getSeconds();

        if (secondsElapsed < 0)
            secondsElapsed = 0; // Guard

        if (secondsElapsed >= trip.totalDurationSeconds) {
            // Trip Over
            activeTrips.remove(vehicle.getId());
            return;
        }

        // Calculate progress
        double progress = (double) secondsElapsed / trip.totalDurationSeconds;
        int targetIndex = (int) (progress * (trip.path.size() - 1));

        if (targetIndex < trip.path.size() && targetIndex >= 0) {
            double[] coords = trip.path.get(targetIndex);

            // Calculate Distance Delta for Odometer
            if (vehicle.getLatitude() != null && vehicle.getLongitude() != null) {
                double distance = calculateHaversine(vehicle.getLatitude(), vehicle.getLongitude(), coords[0],
                        coords[1]);
                vehicle.setOdometer(vehicle.getOdometer() + distance);
            }

            vehicle.setLatitude(coords[0]);
            vehicle.setLongitude(coords[1]);

            // Simulate Wear (0.01% - 0.05% per update)
            vehicle.setEngineHealth(Math.max(0, vehicle.getEngineHealth() - (0.01 + Math.random() * 0.04)));
            vehicle.setBatteryHealth(Math.max(0, vehicle.getBatteryHealth() - (0.02 + Math.random() * 0.03)));
            vehicle.setTireWear(Math.min(100, vehicle.getTireWear() + (0.01 + Math.random() * 0.02)));
            // Simulate Fuel Consumption (0.5% - 1.5% per update while moving)
            if (vehicle.getFuelPercent() != null) {
                vehicle.setFuelPercent((int) Math.max(0, vehicle.getFuelPercent() - (0.5 + Math.random() * 1.0)));
            }

            // Update Tire Pressure (Simulate slight drops)
            if (Math.random() > 0.95) {
                vehicle.setTirePressure(vehicle.getTirePressure() - 0.1);
            }
        }
    }

    private double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth radius in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Simulate health degradation for ALL vehicles (idle + active)
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void simulateHealthDegradation() {
        List<Vehicle> vehicles = vehicleRepo.findAll();

        for (Vehicle v : vehicles) {
            if (v.getStatus() == null || v.getStatus().equalsIgnoreCase("Pending") ||
                    v.getStatus().equalsIgnoreCase("Maintenance") || v.getStatus().equalsIgnoreCase("Inactive")) {
                continue; // Skip pending, maintenance, and inactive vehicles
            }

            // Initialize health values if null
            if (v.getEngineHealth() == null)
                v.setEngineHealth(100.0);
            if (v.getBatteryHealth() == null)
                v.setBatteryHealth(100.0);
            if (v.getTireWear() == null)
                v.setTireWear(0.0);
            if (v.getTirePressure() == null)
                v.setTirePressure(32.0);
            if (v.getOdometer() == null)
                v.setOdometer(0.0);
            if (v.getFuelPercent() == null)
                v.setFuelPercent(100);

            boolean isOnTrip = activeTrips.containsKey(v.getId());

            if (isOnTrip) {
                // Vehicles on trips degrade faster (handled in updateVehiclePosition)
                // No additional degradation needed here
            } else {
                // Idle vehicles degrade slowly
                // Battery drains slowly when idle (0.005% - 0.01% per 30 sec)
                v.setBatteryHealth(Math.max(0, v.getBatteryHealth() - (0.005 + Math.random() * 0.005)));

                // Tire pressure drops very slowly (0.01 PSI per 30 sec, ~5% chance)
                if (Math.random() > 0.95) {
                    v.setTirePressure(Math.max(20, v.getTirePressure() - 0.01));
                }

                // Engine health stays stable when idle (very minimal degradation)
                if (Math.random() > 0.98) {
                    v.setEngineHealth(Math.max(0, v.getEngineHealth() - 0.001));
                }

                // Fuel evaporation/idle consumption (very minimal)
                if (Math.random() > 0.99) { // 1% chance every 30s
                    v.setFuelPercent(Math.max(0, v.getFuelPercent() - 1));
                }

                // Tire wear doesn't increase when idle
            }

            v.setLastUpdate(java.time.LocalDateTime.now());
            vehicleRepo.save(v);
        }
    }
}
