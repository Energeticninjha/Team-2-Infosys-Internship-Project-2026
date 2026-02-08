package com.neurofleetx.controller;

import com.neurofleetx.model.User;
import com.neurofleetx.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepo;

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates) {
        return userRepo.findById(id).map(user -> {
            // Update name
            if (updates.containsKey("name")) {
                user.setName((String) updates.get("name"));
            }

            // Update phone
            if (updates.containsKey("phone")) {
                user.setPhone((String) updates.get("phone"));
            }

            // Update profile photo
            if (updates.containsKey("profilePhotoUrl")) {
                user.setProfilePhotoUrl((String) updates.get("profilePhotoUrl"));
            }

            // Save and return
            User updated = userRepo.save(user);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<User> getUserByEmail(@PathVariable String email) {
        return userRepo.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
