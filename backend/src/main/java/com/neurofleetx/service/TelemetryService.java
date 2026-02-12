package com.neurofleetx.service;

import com.neurofleetx.model.Alert;
import com.neurofleetx.model.TelemetryHistory;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.repo.AlertRepository;
import com.neurofleetx.repo.TelemetryHistoryRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TelemetryService {

        @Autowired
        private VehicleRepository vehicleRepo;

        @Autowired
        private TelemetryHistoryRepository telemetryHistoryRepo;

        @Autowired
        private AlertRepository alertRepo;

        // Record telemetry every 5 minutes
        @Scheduled(fixedRate = 300000) // 5 minutes
        public void recordTelemetryHistory() {
                List<Vehicle> vehicles = vehicleRepo.findAll();

                for (Vehicle v : vehicles) {
                        if (v.getStatus() != null && !v.getStatus().equalsIgnoreCase("Pending")) {
                                TelemetryHistory history = TelemetryHistory.builder()
                                                .vehicleId(v.getId())
                                                .vehicleModel(v.getModel())
                                                .numberPlate(v.getNumberPlate())
                                                .driverName(v.getDriverName())
                                                .speed(v.getSpeed())
                                                .batteryPercent(v.getBatteryPercent())
                                                .fuelPercent(v.getFuelPercent())
                                                .odometer(v.getOdometer())
                                                .engineHealth(v.getEngineHealth())
                                                .tireWear(v.getTireWear())
                                                .batteryHealth(v.getBatteryHealth())
                                                .tirePressure(v.getTirePressure())
                                                .latitude(v.getLatitude())
                                                .longitude(v.getLongitude())
                                                .vehicleStatus(v.getStatus())
                                                .build();

                                telemetryHistoryRepo.save(history);
                        }
                }

                System.out.println("📊 Telemetry history recorded for " + vehicles.size() + " vehicles");
        }

        // Check for alerts every minute
        @Scheduled(fixedRate = 60000) // 1 minute
        public void checkAndCreateAlerts() {
                List<Vehicle> vehicles = vehicleRepo.findAll();

                for (Vehicle v : vehicles) {
                        if (v.getStatus() == null || v.getStatus().equalsIgnoreCase("Pending")) {
                                continue;
                        }

                        // Check Battery Low
                        if (v.getBatteryPercent() != null && v.getBatteryPercent() < 20) {
                                createAlertIfNotExists(v, "BATTERY_LOW", "CRITICAL",
                                                "Battery critically low at " + v.getBatteryPercent() + "%",
                                                v.getBatteryPercent().doubleValue());
                        }

                        // Check Engine Health
                        if (v.getEngineHealth() != null && v.getEngineHealth() < 30) {
                                createAlertIfNotExists(v, "ENGINE_CRITICAL", "CRITICAL",
                                                "Engine health critical at " + v.getEngineHealth().intValue() + "%",
                                                v.getEngineHealth());
                        } else if (v.getEngineHealth() != null && v.getEngineHealth() < 50) {
                                createAlertIfNotExists(v, "ENGINE_WARNING", "WARNING",
                                                "Engine health low at " + v.getEngineHealth().intValue() + "%",
                                                v.getEngineHealth());
                        }

                        // Check Tire Wear
                        if (v.getTireWear() != null && v.getTireWear() > 80) {
                                createAlertIfNotExists(v, "TIRE_WEAR_HIGH", "CRITICAL",
                                                "Tire wear critically high at " + v.getTireWear().intValue() + "%",
                                                v.getTireWear());
                        } else if (v.getTireWear() != null && v.getTireWear() > 60) {
                                createAlertIfNotExists(v, "TIRE_WEAR_WARNING", "WARNING",
                                                "Tire wear high at " + v.getTireWear().intValue() + "%",
                                                v.getTireWear());
                        }

                        // Check Tire Pressure
                        if (v.getTirePressure() != null && v.getTirePressure() < 28) {
                                createAlertIfNotExists(v, "TIRE_PRESSURE_LOW", "WARNING",
                                                "Tire pressure low at " + v.getTirePressure() + " PSI",
                                                v.getTirePressure());
                        }

                        // Check Battery Health
                        if (v.getBatteryHealth() != null && v.getBatteryHealth() < 30) {
                                createAlertIfNotExists(v, "BATTERY_HEALTH_CRITICAL", "CRITICAL",
                                                "Battery health critical at " + v.getBatteryHealth().intValue() + "%",
                                                v.getBatteryHealth());
                        }

                        // Check Fuel Level
                        if (v.getFuelPercent() != null && v.getFuelPercent() < 15) {
                                createAlertIfNotExists(v, "FUEL_LOW", "WARNING",
                                                "Fuel level low at " + v.getFuelPercent() + "%",
                                                v.getFuelPercent().doubleValue());
                        }
                }
        }

        private void createAlertIfNotExists(Vehicle v, String alertType, String severity, String message,
                        Double value) {
                // Check if there's already an active alert of this type for this vehicle
                List<Alert> existingAlerts = alertRepo.findByVehicleIdAndStatusOrderByCreatedAtDesc(v.getId(),
                                "ACTIVE");
                boolean alertExists = existingAlerts.stream()
                                .anyMatch(a -> a.getAlertType().equals(alertType));

                if (!alertExists) {
                        Alert alert = Alert.builder()
                                        .vehicleId(v.getId())
                                        .vehicleModel(v.getModel())
                                        .numberPlate(v.getNumberPlate())
                                        .driverName(v.getDriverName())
                                        .alertType(alertType)
                                        .severity(severity)
                                        .message(message)
                                        .value(value)
                                        .status("ACTIVE")
                                        .build();

                        alertRepo.save(alert);
                        System.out.println("🚨 Alert created: " + alertType + " for vehicle " + v.getNumberPlate());
                }
        }

        public List<TelemetryHistory> getVehicleHistory(Long vehicleId, int hours) {
                LocalDateTime since = LocalDateTime.now().minusHours(hours);
                return telemetryHistoryRepo.findRecentByVehicleId(vehicleId, since);
        }

        public Map<String, Object> getFleetUtilization() {
                List<Vehicle> allVehicles = vehicleRepo.findAll();

                long totalVehicles = allVehicles.stream()
                                .filter(v -> v.getStatus() != null && !v.getStatus().equalsIgnoreCase("Pending"))
                                .count();

                long activeVehicles = allVehicles.stream()
                                .filter(v -> "Active".equalsIgnoreCase(v.getStatus())
                                                || "Enroute".equalsIgnoreCase(v.getStatus()))
                                .count();

                long maintenanceVehicles = allVehicles.stream()
                                .filter(v -> "Maintenance".equalsIgnoreCase(v.getStatus()))
                                .count();

                long inactiveVehicles = allVehicles.stream()
                                .filter(v -> "Inactive".equalsIgnoreCase(v.getStatus()))
                                .count();

                double utilizationRate = totalVehicles > 0 ? (activeVehicles * 100.0 / totalVehicles) : 0;

                double avgOdometer = allVehicles.stream()
                                .filter(v -> v.getOdometer() != null)
                                .mapToDouble(Vehicle::getOdometer)
                                .average()
                                .orElse(0.0);

                double avgEngineHealth = allVehicles.stream()
                                .filter(v -> v.getEngineHealth() != null)
                                .mapToDouble(Vehicle::getEngineHealth)
                                .average()
                                .orElse(100.0);

                Map<String, Object> metrics = new HashMap<>();
                metrics.put("totalVehicles", totalVehicles);
                metrics.put("activeVehicles", activeVehicles);
                metrics.put("maintenanceVehicles", maintenanceVehicles);
                metrics.put("inactiveVehicles", inactiveVehicles);
                metrics.put("utilizationRate", Math.round(utilizationRate * 10) / 10.0);
                metrics.put("avgOdometer", Math.round(avgOdometer * 10) / 10.0);
                metrics.put("avgFleetHealth", Math.round(avgEngineHealth * 10) / 10.0);

                return metrics;
        }

        public Map<String, Object> getFleetHealthTrends(int days) {
                LocalDateTime since = LocalDateTime.now().minusDays(days);
                List<TelemetryHistory> allHistory = telemetryHistoryRepo.findAll().stream()
                                .filter(h -> h.getRecordedAt() != null && h.getRecordedAt().isAfter(since))
                                .sorted((a, b) -> a.getRecordedAt().compareTo(b.getRecordedAt()))
                                .toList();

                // Group by day and calculate averages
                Map<String, double[]> dailyAverages = new java.util.LinkedHashMap<>();

                for (int i = 0; i < days; i++) {
                        LocalDateTime dayStart = LocalDateTime.now().minusDays(days - i - 1).withHour(0).withMinute(0)
                                        .withSecond(0);
                        LocalDateTime dayEnd = dayStart.plusDays(1);

                        List<TelemetryHistory> dayData = allHistory.stream()
                                        .filter(h -> h.getRecordedAt().isAfter(dayStart)
                                                        && h.getRecordedAt().isBefore(dayEnd))
                                        .toList();

                        if (!dayData.isEmpty()) {
                                double avgEngine = dayData.stream()
                                                .filter(h -> h.getEngineHealth() != null)
                                                .mapToDouble(TelemetryHistory::getEngineHealth)
                                                .average()
                                                .orElse(100.0);

                                double avgBattery = dayData.stream()
                                                .filter(h -> h.getBatteryHealth() != null)
                                                .mapToDouble(TelemetryHistory::getBatteryHealth)
                                                .average()
                                                .orElse(100.0);

                                double avgTireWear = dayData.stream()
                                                .filter(h -> h.getTireWear() != null)
                                                .mapToDouble(TelemetryHistory::getTireWear)
                                                .average()
                                                .orElse(0.0);

                                String dayLabel = dayStart.toLocalDate().toString();
                                // Add fuel to average array (index 3)
                                double avgFuel = dayData.stream()
                                                .filter(h -> h.getFuelPercent() != null)
                                                .mapToDouble(TelemetryHistory::getFuelPercent)
                                                .average()
                                                .orElse(0.0);
                                dailyAverages.put(dayLabel,
                                                new double[] { avgEngine, avgBattery, avgTireWear, avgFuel });
                        }
                }

                // If no historical data, use current vehicle data
                if (dailyAverages.isEmpty()) {
                        List<Vehicle> vehicles = vehicleRepo.findAll();
                        double avgEngine = vehicles.stream()
                                        .filter(v -> v.getEngineHealth() != null)
                                        .mapToDouble(Vehicle::getEngineHealth)
                                        .average()
                                        .orElse(100.0);

                        double avgBattery = vehicles.stream()
                                        .filter(v -> v.getBatteryHealth() != null)
                                        .mapToDouble(Vehicle::getBatteryHealth)
                                        .average()
                                        .orElse(100.0);

                        double avgTireWear = vehicles.stream()
                                        .filter(v -> v.getTireWear() != null)
                                        .mapToDouble(Vehicle::getTireWear)
                                        .average()
                                        .orElse(0.0);

                        double avgFuel = vehicles.stream()
                                        .filter(v -> v.getFuelPercent() != null)
                                        .mapToDouble(Vehicle::getFuelPercent)
                                        .average()
                                        .orElse(0.0);

                        for (int i = 0; i < days; i++) {
                                String dayLabel = LocalDateTime.now().minusDays(days - i - 1).toLocalDate().toString();
                                dailyAverages.put(dayLabel,
                                                new double[] { avgEngine, avgBattery, avgTireWear, avgFuel });
                        }
                }

                Map<String, Object> result = new HashMap<>();
                result.put("labels", new java.util.ArrayList<>(dailyAverages.keySet()));
                result.put("engineHealth", dailyAverages.values().stream().mapToDouble(arr -> arr[0]).toArray());
                result.put("batteryHealth", dailyAverages.values().stream().mapToDouble(arr -> arr[1]).toArray());
                result.put("tireWear", dailyAverages.values().stream().mapToDouble(arr -> arr[2]).toArray());
                result.put("fuelLevels", dailyAverages.values().stream().mapToDouble(arr -> arr[3]).toArray());

                return result;
        }
}
