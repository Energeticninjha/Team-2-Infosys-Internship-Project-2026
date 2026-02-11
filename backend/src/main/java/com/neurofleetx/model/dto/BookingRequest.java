package com.neurofleetx.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingRequest {
    private Long userId;
    private Long vehicleId;
    private Long tripId; // For bookings from posted trips
    private Long driverId; // Driver who posted the trip
    private String startLocation;
    private String endLocation;
    private Double price;
    private String estimatedTime; // Matches frontend payload
    private String routeId;
    private LocalDateTime scheduledStartTime;
    private Integer durationHours;
    private Integer passengerCount;
}
