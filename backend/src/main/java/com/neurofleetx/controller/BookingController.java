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
@CrossOrigin(origins = { "http://localhost:3000", "http://localhost:3001" })
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

    // Mission Control: Get pending booking requests for a driver
    @GetMapping("/driver/{driverId}/pending-requests")
    public List<java.util.Map<String, Object>> getDriverPendingRequests(@PathVariable Long driverId) {
        System.out.println("🔍 Fetching pending requests for Driver ID: " + driverId);
        List<Booking> pendingBookings = bookingRepo.findAll().stream()
                .filter(b -> b.getDriverId() != null && b.getDriverId().equals(driverId))
                .filter(b -> "PENDING".equals(b.getStatus()))
                .sorted((a, b) -> b.getId().compareTo(a.getId())) // Latest first
                .collect(java.util.stream.Collectors.toList());

        // Enrich with customer details
        List<java.util.Map<String, Object>> enrichedBookings = new java.util.ArrayList<>();
        for (Booking booking : pendingBookings) {
            java.util.Map<String, Object> bookingMap = new java.util.HashMap<>();
            bookingMap.put("id", booking.getId());
            bookingMap.put("startLocation", booking.getStartLocation());
            bookingMap.put("endLocation", booking.getEndLocation());
            bookingMap.put("scheduledStartTime", booking.getScheduledStartTime());
            bookingMap.put("passengerCount", booking.getPassengerCount());
            bookingMap.put("amount", booking.getAmount());
            bookingMap.put("status", booking.getStatus());

            // Add customer details
            if (booking.getUser() != null) {
                java.util.Map<String, Object> customerMap = new java.util.HashMap<>();
                customerMap.put("id", booking.getUser().getId());
                customerMap.put("name", booking.getUser().getName());
                customerMap.put("phone", booking.getUser().getPhone());
                customerMap.put("email", booking.getUser().getEmail());
                customerMap.put("profilePhotoUrl", booking.getUser().getProfilePhotoUrl());
                bookingMap.put("customer", customerMap);
            }

            enrichedBookings.add(bookingMap);
        }

        System.out.println("✅ Found " + enrichedBookings.size() + " pending requests");
        return enrichedBookings;
    }

    // Mission Control: Get active/confirmed jobs for a driver
    @GetMapping("/driver/{driverId}/active-jobs")
    public List<java.util.Map<String, Object>> getDriverActiveJobs(@PathVariable Long driverId) {
        System.out.println("🔍 Fetching active jobs for Driver ID: " + driverId);
        List<Booking> activeBookings = bookingRepo.findAll().stream()
                .filter(b -> b.getDriverId() != null && b.getDriverId().equals(driverId))
                .filter(b -> "CONFIRMED".equals(b.getStatus()) || "IN_PROGRESS".equals(b.getStatus()))
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .collect(java.util.stream.Collectors.toList());

        // Enrich with customer details
        List<java.util.Map<String, Object>> enrichedBookings = new java.util.ArrayList<>();
        for (Booking booking : activeBookings) {
            java.util.Map<String, Object> bookingMap = new java.util.HashMap<>();
            bookingMap.put("id", booking.getId());
            bookingMap.put("startLocation", booking.getStartLocation());
            bookingMap.put("endLocation", booking.getEndLocation());
            bookingMap.put("scheduledStartTime", booking.getScheduledStartTime());
            bookingMap.put("startTime", booking.getStartTime());
            bookingMap.put("passengerCount", booking.getPassengerCount());
            bookingMap.put("amount", booking.getAmount());
            bookingMap.put("status", booking.getStatus());
            bookingMap.put("estimatedDuration", booking.getEstimatedDuration());

            // Add customer details
            if (booking.getUser() != null) {
                java.util.Map<String, Object> customerMap = new java.util.HashMap<>();
                customerMap.put("id", booking.getUser().getId());
                customerMap.put("name", booking.getUser().getName());
                customerMap.put("phone", booking.getUser().getPhone());
                customerMap.put("email", booking.getUser().getEmail());
                customerMap.put("profilePhotoUrl", booking.getUser().getProfilePhotoUrl());
                bookingMap.put("customer", customerMap);
            }

            enrichedBookings.add(bookingMap);
        }

        System.out.println("✅ Found " + enrichedBookings.size() + " active jobs");
        return enrichedBookings;
    }

    // Accept/Confirm a booking request
    @PutMapping("/{id}/accept")
    public Booking acceptBooking(@PathVariable Long id) {
        System.out.println("✅ Driver accepting booking ID: " + id);
        Booking booking = bookingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        booking.setStatus("CONFIRMED");
        booking.setStartTime(java.time.LocalDateTime.now());

        Booking savedBooking = bookingRepo.save(booking);
        System.out.println("✅ Booking " + id + " status updated to CONFIRMED");
        return savedBooking;
    }
}
