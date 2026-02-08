package com.neurofleetx.controller;

import com.neurofleetx.model.User;
import com.neurofleetx.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepo;

    // Get User Profile
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserProfile(@PathVariable Long id) {
        Optional<User> user = userRepo.findById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        }
        return ResponseEntity.notFound().build();
    }

    // Update User Profile
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long id, @RequestBody User updates) {
        Optional<User> userOpt = userRepo.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();

        // Only allow updating specific fields for self-service
        if (updates.getName() != null)
            user.setName(updates.getName());
        if (updates.getPhone() != null)
            user.setPhone(updates.getPhone());
        if (updates.getProfilePhotoUrl() != null)
            user.setProfilePhotoUrl(updates.getProfilePhotoUrl());

        // Don't allow updating email, password, role, etc. from here for security

        userRepo.save(user);
        return ResponseEntity.ok(user);
    }
}
