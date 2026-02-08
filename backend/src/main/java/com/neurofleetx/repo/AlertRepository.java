package com.neurofleetx.repo;

import com.neurofleetx.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatusOrderByCreatedAtDesc(String status);

    List<Alert> findByVehicleIdAndStatusOrderByCreatedAtDesc(Long vehicleId, String status);

    List<Alert> findByVehicleIdOrderByCreatedAtDesc(Long vehicleId);

    List<Alert> findBySeverityAndStatusOrderByCreatedAtDesc(String severity, String status);

    long countByStatus(String status);

    long countByVehicleIdAndStatus(Long vehicleId, String status);
}
