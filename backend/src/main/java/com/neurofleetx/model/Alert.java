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
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long vehicleId;
    private String vehicleModel;
    private String numberPlate;
    private String driverName;

    // Alert Details
    private String alertType; // BATTERY_LOW, ENGINE_CRITICAL, TIRE_PRESSURE_LOW, TIRE_WEAR_HIGH,
                              // MAINTENANCE_DUE
    private String severity; // INFO, WARNING, CRITICAL
    private String message;
    private Double value; // The metric value that triggered the alert

    // Status
    private String status; // ACTIVE, ACKNOWLEDGED, RESOLVED

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = "ACTIVE";
        }
    }
}
