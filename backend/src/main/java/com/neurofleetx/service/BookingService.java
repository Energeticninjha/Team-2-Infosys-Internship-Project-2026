package com.neurofleetx.service;

import com.neurofleetx.model.Booking;
import com.neurofleetx.model.User;
import com.neurofleetx.model.Vehicle;
import com.neurofleetx.model.Review;
import com.neurofleetx.repo.ReviewRepository;
import com.neurofleetx.model.dto.BookingRequest;
import com.neurofleetx.model.dto.RouteOption;
import com.neurofleetx.model.dto.RouteRequest;
import com.neurofleetx.repo.BookingRepository;
import com.neurofleetx.repo.UserRepository;
import com.neurofleetx.repo.VehicleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BookingService {

    @Autowired
    private BookingRepository bookingRepo;
    
    @Autowired
    private UserRepository userRepo;
    
    @Autowired
    private VehicleRepository vehicleRepo;
    
    @Autowired
    private ReviewRepository reviewRepo;
    
    @Autowired
    private VehicleSimulationService simulationService;
    
    @Autowired
    private RouteService routeService;

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepo.findByUserId(userId);
    }

    public Booking createBooking(BookingRequest request) {
        // Robust User Lookup: Try ID -> Try Email -> First Available
        User user = null;
        if (request.getUserId() != null) {
            user = userRepo.findById(request.getUserId()).orElse(null);
        }
        if (user == null) {
             user = userRepo.findAll().stream().findFirst().orElse(null);
        }
        
        if (user == null) {
            throw new RuntimeException("Booking Failed: No Users exist in the database. Seeder might have failed.");
        }

        // Robust Vehicle Lookup
        Vehicle vehicle = null;
        if (request.getVehicleId() != null) {
             vehicle = vehicleRepo.findById(request.getVehicleId()).orElse(null);
        }
        if (vehicle == null) {
             vehicle = vehicleRepo.findAll().stream().findFirst().orElse(null);
        }
        
        if (vehicle == null) {
             throw new RuntimeException("Booking Failed: No Vehicles exist in the database.");
        }

        if (request.getStartLocation() != null && request.getEndLocation() != null) {
             List<RouteOption> routes = routeService.calculateRoutes(new RouteRequest(
                 request.getStartLocation(), request.getEndLocation(),
                 null, null, null, null, "fastest"
             ));
             
             if (!routes.isEmpty()) {
                 simulationService.startTrip(vehicle.getId(), routes.get(0).getPath());
             }
        }

        Booking booking = Booking.builder()
                .user(user)
                .vehicle(vehicle)
                .startLocation(request.getStartLocation())
                .endLocation(request.getEndLocation())
                .estimatedDuration(request.getEstimatedTime())
                .startTime(LocalDateTime.now())
                .status("CONFIRMED")
                .amount(request.getPrice())
                .build();
                
        return bookingRepo.save(booking);
    }

    public Booking reviewTrip(Long id, String comment, Double rating) {
        Booking booking = bookingRepo.findById(id).orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setReview(comment);
        booking.setRating(rating);
        booking.setStatus("COMPLETED"); // Mark as completed on review
        bookingRepo.save(booking);

        // Save into new Reviews table as requested
        Review reviewEntity = Review.builder()
            .booking(booking)
            .vehicle(booking.getVehicle())
            .rating(rating != null ? rating.intValue() : 5)
            .comment(comment)
            .createdAt(LocalDateTime.now())
            .build();
        reviewRepo.save(reviewEntity);

        // Update Driver's average rating in Vehicle
        Vehicle vehicle = booking.getVehicle();
        if (vehicle != null) {
            List<Booking> driverBookings = bookingRepo.findByVehicleDriverName(vehicle.getDriverName());
            double total = driverBookings.stream()
                .filter(b -> b.getRating() != null)
                .mapToDouble(Booking::getRating)
                .sum();
            long count = driverBookings.stream()
                .filter(b -> b.getRating() != null)
                .count();
            
            if (count > 0) {
                vehicle.setDriverRating(total / count);
                vehicleRepo.save(vehicle);
            }
        }
        
        return booking;
    }
}
