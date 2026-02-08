package com.neurofleetx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendAp plication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner resetOnlineStatus(com.neurofleetx.repo.UserRepository userRepo) {
        return args -> {
            java.util.List<com.neurofleetx.model.User> onlineUsers = userRepo.findByRoleAndIsOnlineTrue("DRIVER");
            for (com.neurofleetx.model.User u : onlineUsers) {
                u.setIsOnline(false);
                userRepo.save(u);
            }
            // Also reset testdrriver02 specifically if it exists despite role
            userRepo.findByEmail("testdrriver02@gmail.com").ifPresent(u -> {
                u.setIsOnline(false);
                userRepo.save(u);
            });
            System.out.println("🔄 [Startup] Reset " + onlineUsers.size() + " drivers to OFFLINE.");
        };
    }
}
