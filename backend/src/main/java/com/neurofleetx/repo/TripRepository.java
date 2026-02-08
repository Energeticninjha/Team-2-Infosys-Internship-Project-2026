package com.neurofleetx.repo;

import com.neurofleetx.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {
    List<Trip> findByDriverId(Long driverId);

    List<Trip> findByDriverIdAndStatus(Long driverId, String status);

    List<Trip> findByStatus(String status);
}
