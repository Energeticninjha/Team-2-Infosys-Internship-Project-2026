package com.neurofleetx.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // Disable CSRF for development
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Enable CORS
            .authorizeHttpRequests(auth -> auth
                // Public Endpoints
                .requestMatchers("/api/auth/**").permitAll()
                
                // Allow Booking - In prod, this would be authenticated, but for dev flow we allow it
                // Ideally: .requestMatchers("/api/bookings/**").hasAnyRole("CUSTOMER", "ADMIN")
                // For now, allow public to avoid frontend auth complexity issues in demo
                .requestMatchers("/api/bookings/**").permitAll() 
                
                // Fleet/Vehicle Info - Public or Auth
                .requestMatchers("/api/vehicles/live").permitAll()
                .requestMatchers("/api/fleet/**").permitAll()
                
                // Admin Only (RBAC Example)
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // Driver Only (Relaxed for Dev)
                .requestMatchers("/api/driver/**").permitAll()
                
                .requestMatchers("/api/recommendations/**").permitAll()
                .requestMatchers("/api/**").permitAll() 
                .anyRequest().authenticated()
            );

        return http.build();
    }

    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:3001"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
