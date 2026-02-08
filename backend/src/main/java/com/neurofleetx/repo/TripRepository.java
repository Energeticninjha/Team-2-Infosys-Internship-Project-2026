package com.neurofleetx.repo;

import com.neurofleetx.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findByDriverId(Long driverId);

    // Find active trips for a driver
    List<Trip> findByDriverIdAndStatus(Long driverId, String status);

    // Search for trips
    @Query("SELECT t FROM Trip t WHERE t.fromLocation LIKE %:from% AND t.toLocation LIKE %:to% AND t.availableDate = :date AND t.status = 'AVAILABLE'")
    List<Trip> searchTrips(@Param("from") String from, @Param("to") String to, @Param("date") LocalDate date);

    // Find all available trips
    List<Trip> findByStatus(String status);
}
