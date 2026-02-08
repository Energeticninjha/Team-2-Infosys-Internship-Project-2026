package com.neurofleetx.repo;

import com.neurofleetx.model.TelemetryHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TelemetryHistoryRepository extends JpaRepository<TelemetryHistory, Long> {

    List<TelemetryHistory> findByVehicleIdOrderByRecordedAtDesc(Long vehicleId);

    List<TelemetryHistory> findByVehicleIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long vehicleId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT th FROM TelemetryHistory th WHERE th.vehicleId = ?1 ORDER BY th.recordedAt DESC")
    List<TelemetryHistory> findLatestByVehicleId(Long vehicleId);

    // Get records from last N hours
    @Query("SELECT th FROM TelemetryHistory th WHERE th.vehicleId = ?1 AND th.recordedAt >= ?2 ORDER BY th.recordedAt DESC")
    List<TelemetryHistory> findRecentByVehicleId(Long vehicleId, LocalDateTime since);
}
