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
@Table(name = "vehicles")
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name; // e.g. "V001" (Internal ID)
    private String model; // e.g. "Toyota Innova"
    private String numberPlate; // e.g. "TN 09 AZ 1234"
    
    private String driverName; // e.g. "Rajesh K"
    private String driverContact; // e.g. "+91 9876543210"
    private Double driverRating; // e.g. 4.8
    
    private String type; // SUV, Sedan
    private Integer seats; // e.g. 4 or 6
    private Boolean ev;
    
    // Status: Active, Idle, Maintenance, Enroute
    private String status; 
    
    private Double latitude;
    private Double longitude;
    private Integer batteryPercent;
    private Integer fuelPercent;
    
    // Telemetry & Health (Module 2 & 4)
    private Double speed; // km/h
    private Double odometer; // total distance
    private Double tirePressure; // PSI
    
    // Module 4: Predictive Maintenance
    private Double engineHealth; // 0-100
    private Double tireWear; // 0-100
    private Double batteryHealth; // 0-100
    private LocalDateTime nextMaintenanceDate;
    
    private LocalDateTime lastUpdate;
}
