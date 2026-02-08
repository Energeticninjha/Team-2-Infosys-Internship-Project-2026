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
@Table(name = "trips")
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long driverId;

    // Instead of vehicleId, linked to Vehicle entity? Or just ID for simplicity
    private Long vehicleId;

    private String fromLocation;
    private String toLocation;

    // Coordinates
    private Double fromLat;
    private Double fromLng;
    private Double toLat;
    private Double toLng;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private Integer seatsAvailable;
    private Double pricePerSeat;

    private String status; // AVAILABLE, IN_PROGRESS, COMPLETED, CANCELLED

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
