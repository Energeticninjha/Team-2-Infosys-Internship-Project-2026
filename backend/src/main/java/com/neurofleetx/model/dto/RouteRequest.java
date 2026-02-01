package com.neurofleetx.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RouteRequest {
    // Strings for display/geocoding if needed
    private String startLocation;
    private String endLocation;
    
    // Explicit coordinates
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
    
    private String optimizationMode; // "fastest", "eco", "traffic"
}
