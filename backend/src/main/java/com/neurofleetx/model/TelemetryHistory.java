package com.neurofleetx.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "telemetry_history")
public class TelemetryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long vehicleId;
    private String vehicleModel;
    private String numberPlate;
    private String driverName;

    // Telemetry Data
    private Double speed; // km/h
    private Integer batteryPercent;
    private Integer fuelPercent;
    private Double odometer; // km

    // Health Metrics
    private Double engineHealth;
    private Double tireWear;
    private Double batteryHealth;
    private Double tirePressure;

    // Location
    private Double latitude;
    private Double longitude;

    // Status
    private String vehicleStatus;

    // Timestamp
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }
}
