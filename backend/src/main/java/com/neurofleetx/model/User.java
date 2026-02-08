package com.neurofleetx.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    private String role; // admin, manager, driver, customer

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String profilePhotoUrl;

    private String phone;

    // Driver Management Fields
    @Builder.Default
    @Column(name = "is_blocked")
    private Boolean isBlocked = false;

    @Builder.Default
    @Column(name = "performance_score")
    private Double performanceScore = 5.0;

    @Column(name = "license_number")
    private String licenseNumber;

    @Column(name = "vehicle_id")
    private Long vehicleId;

    // Driver Live Status Fields
    @Builder.Default
    @Column(name = "is_online")
    private Boolean isOnline = false;

    @Column(name = "current_lat")
    private Double currentLat;

    @Column(name = "current_lng")
    private Double currentLng;

    @Column(name = "last_login")
    private java.time.LocalDateTime lastLogin;
}
