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
@Table(name = "bookings")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    private String startLocation;
    private String endLocation;
    private String estimatedDuration; // e.g. "24 mins"

    private LocalDateTime startTime;
    private LocalDateTime scheduledStartTime;
    private LocalDateTime endTime;

    private String status; // PENDING, CONFIRMED, COMPLETED, CANCELLED
    private Double amount;

    private String review;
    private Double rating;

    private Integer passengerCount; // Added field

    // Trip-based booking fields
    private Long tripId; // Reference to the Trip that was booked
    private Long driverId; // Driver who posted the trip
}
