package com.neurofleetx.controller;

import com.neurofleetx.model.Booking;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.dto.BookingRequest;
import com.neurofleetx.repo.BookingRepository;
import com.neurofleetx.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class BookingController {

    @Autowired
    private BookingService bookingService;
    
    @Autowired
    private BookingRepository bookingRepo;

    @PostMapping
    public Booking createBooking(@RequestBody BookingRequest request) {
        System.out.println("Received Booking Request: " + request);
        return bookingService.createBooking(request);
    }
    
    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepo.findAll();
    }
    
    // Module 5 Ext: "My Trips"
    @GetMapping("/user/{userId}")
    public List<java.util.Map<String, Object>> getUserBookings(@PathVariable Long userId) {
        System.out.println("🔍 Fetching safe history for User ID: " + userId);
        return bookingService.getUserBookings(userId);
    }


    
    @PutMapping("/{id}/status")
    public Booking updateBookingStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> statusData) {
        String newStatus = statusData.get("status");
        Booking booking = bookingRepo.findById(id).orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setStatus(newStatus);
        if ("COMPLETED".equals(newStatus)) {
            booking.setEndTime(java.time.LocalDateTime.now());
        }
        return bookingRepo.save(booking);
    }

    @PostMapping("/{id}/review")
    public Booking submitReview(@PathVariable Long id, @RequestBody java.util.Map<String, Object> reviewData) {
        System.out.println("Processing review for booking ID: " + id);
        try {
            String comment = reviewData.get("comment") != null ? reviewData.get("comment").toString() : "";
            Double rating = Double.valueOf(reviewData.get("rating").toString());
            System.out.println("Review Content - Rating: " + rating + ", Comment: " + comment);
            return bookingService.reviewTrip(id, comment, rating);
        } catch (Exception e) {
            System.err.println("Error submitting review: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Feedback Submission Failed: " + e.getMessage());
        }
    }
}
