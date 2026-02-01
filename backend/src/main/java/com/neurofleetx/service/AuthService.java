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
        System.out.println("🔐 Login Attempt for: " + request.getEmail());
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    System.out.println("❌ User not found: " + request.getEmail());
                    return new RuntimeException("User not found");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
             System.out.println("❌ Password mismatch for: " + request.getEmail());
             throw new RuntimeException("Invalid credentials");
        }

        System.out.println("✅ Login Successful for: " + request.getEmail() + " (Role: " + user.getRole() + ")");
        return AuthResponse.builder()
                .token("mock-jwt-token-" + user.getId())
                .role(user.getRole())
                .id(user.getId())
                .build();
    }
}
