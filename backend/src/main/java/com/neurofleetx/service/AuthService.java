package com.neurofleetx.service;

import com.neurofleetx.model.User;
import com.neurofleetx.model.dto.AuthResponse;
import com.neurofleetx.model.dto.LoginRequest;
import com.neurofleetx.model.dto.RegisterRequest;
import com.neurofleetx.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // In real app, verify bean exists or use simpler match for now
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        userRepository.save(user);

        return AuthResponse.builder()
                .token("mock-jwt-token-" + user.getId())
                .role(user.getRole())
                .id(user.getId())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        System.out.println("🔐 [AuthService] Login Attempt for Email: [" + request.getEmail() + "]");
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    System.err.println("❌ [AuthService] User NOT FOUND in database: [" + request.getEmail() + "]");
                    return new RuntimeException("User not found");
                });

        System.out.println("🔍 [AuthService] User found. Stored Hash starts with: "
                + (user.getPassword().length() > 10 ? user.getPassword().substring(0, 10) : "N/A"));

        boolean matches = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!matches) {
            System.err.println("❌ [AuthService] Password MISMATCH for: [" + request.getEmail() + "]");
            throw new RuntimeException("Invalid credentials");
        }

        // Check if user is blocked
        if (user.getIsBlocked() != null && user.getIsBlocked()) {
            System.err.println("🚫 [AuthService] User is BLOCKED: [" + request.getEmail() + "]");
            throw new RuntimeException("Your account has been blocked. Please contact support.");
        }

        // Update Online Status
        user.setIsOnline(true);
        user.setLastLogin(java.time.LocalDateTime.now());
        userRepository.save(user);

        System.out.println(
                "✅ [AuthService] Login SUCCESS for: [" + request.getEmail() + "] Role: [" + user.getRole() + "]");
        return AuthResponse.builder()
                .token("mock-jwt-token-" + user.getId())
                .role(user.getRole())
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .build();
    }

    public void logout(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setIsOnline(false);
            userRepository.save(user);
            System.out.println("✅ [AuthService] Logout SUCCESS for: [" + email + "]");
        } else {
            System.err.println("⚠️ [AuthService] Logout attempted for non-existent email: [" + email + "]");
        }
    }
}
