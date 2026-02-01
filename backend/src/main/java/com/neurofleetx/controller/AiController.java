package com.neurofleetx.controller;

import com.neurofleetx.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AiController {

    @Autowired
    private BookingService bookingService;

    @GetMapping("/{userId}")
    public java.util.List<java.util.Map<String, Object>> getRecommendations(@PathVariable Long userId) {
        System.out.println("🤖 AI Controller: Fetching recommendations for user " + userId);
        return bookingService.getRecommendedVehicles(userId);
    }
}
