package com.neurofleetx.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RouteOption {
    private String id;
    private String mode; // e.g. "Fastest Route"
    private String duration;
    private String distance;
    private String trafficStatus; // Low, Moderate, High
    private List<double[]> path; // List of [lat, lng] points
}
