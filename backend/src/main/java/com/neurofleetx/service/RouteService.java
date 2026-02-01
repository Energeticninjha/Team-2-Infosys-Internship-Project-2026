package com.neurofleetx.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neurofleetx.model.dto.RouteOption;
import com.neurofleetx.model.dto.RouteRequest;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RouteService {

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // NeuroFleetX Fare Constants
    private static final double BASE_FARE = 50.0;
    private static final double RATE_PER_KM = 12.0;
    private static final double TIME_RATE_PER_MIN = 2.0;

    public List<RouteOption> calculateRoutes(RouteRequest request) {
        List<RouteOption> options = new ArrayList<>();
        
        // Use provided coordinates, default to Chennai if missing
        double startLat = request.getStartLat() != null ? request.getStartLat() : 13.0827;
        double startLng = request.getStartLng() != null ? request.getStartLng() : 80.2707;
        double endLat = request.getEndLat() != null ? request.getEndLat() : 12.9716;
        double endLng = request.getEndLng() != null ? request.getEndLng() : 80.2184;
        
        try {
            // Call OSRM API
            // Format: http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson
            String url = String.format("http://router.project-osrm.org/route/v1/driving/%f,%f;%f,%f?overview=full&geometries=geojson",
                    startLng, startLat, endLng, endLat);
            
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode route = root.path("routes").get(0);
                
                if (route != null) {
                    double distanceMeters = route.path("distance").asDouble();
                    double durationSeconds = route.path("duration").asDouble();
                    JsonNode coords = route.path("geometry").path("coordinates");
                    
                    List<double[]> path = new ArrayList<>();
                    if (coords.isArray()) {
                        for (JsonNode point : coords) {
                            // GeoJSON is [lng, lat], Leaflet needs [lat, lng]
                            path.add(new double[]{point.get(1).asDouble(), point.get(0).asDouble()});
                        }
                    }

                    // Calculate "Real" Fare
                    double distanceKm = distanceMeters / 1000.0;
                    double durationMins = durationSeconds / 60.0;
                    double fare = BASE_FARE + (distanceKm * RATE_PER_KM) + (durationMins * TIME_RATE_PER_MIN);
                    
                    // Option 1: OSRM Route (Standard)
                    options.add(RouteOption.builder()
                            .id(UUID.randomUUID().toString())
                            .mode("OSRM Optimized")
                            .duration(String.format("%.0f mins", durationMins))
                            .distance(String.format("%.1f km", distanceKm))
                            .trafficStatus("Live")
                            .path(path)
                            .build());
                            
                    // Option 2: Mock Eco (Just for variety, using slightly modified stats)
                    // In real world, we'd query OSRM for "bicycle" or avoid_highways
                    options.add(RouteOption.builder()
                            .id(UUID.randomUUID().toString())
                            .mode("Eco-Friendly")
                            .duration(String.format("%.0f mins", durationMins * 1.2)) // Slower
                            .distance(String.format("%.1f km", distanceKm))
                            .trafficStatus("Low")
                            .path(path) // Re-use path for now as OSRM provides one best route usually
                            .build());
                }
            } else {
                System.err.println("OSRM API Failed: " + response.statusCode());
                // Fallback to interpolation if API fails
                options.add(getFallbackRoute(startLat, startLng, endLat, endLng));
            }

        } catch (Exception e) {
            e.printStackTrace();
            options.add(getFallbackRoute(startLat, startLng, endLat, endLng));
        }
        
        return options;
    }
    
    private RouteOption getFallbackRoute(double startLat, double startLng, double endLat, double endLng) {
         return RouteOption.builder()
                .id(UUID.randomUUID().toString())
                .mode("Fallback (Interpolated)")
                .duration("30 mins")
                .distance("10 km")
                .trafficStatus("Unknown")
                .path(interpolate(startLat, startLng, endLat, endLng, 20, 0.0))
                .build();
    }

    private List<double[]> interpolate(double lat1, double lng1, double lat2, double lng2, int steps, double curveFactor) {
        List<double[]> path = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double t = (double) i / steps;
            double lat = lat1 + (lat2 - lat1) * t;
            double lng = lng1 + (lng2 - lng1) * t;
            path.add(new double[]{lat, lng});
        }
        return path;
    }
}
