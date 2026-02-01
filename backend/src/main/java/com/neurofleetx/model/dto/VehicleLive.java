package com.neurofleetx.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleLive {
    private Long id;
    private String driverName;
    private String model;
    private String status;
    private double latitude;
    private double longitude;
    private int speed;
    private String eta;
    
    // New Fields
    private String numberPlate;
    private String driverContact;
    private Double driverRating;
    private int seats;
}
