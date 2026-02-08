package com.neurofleetx.repo;

import com.neurofleetx.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    List<User> findByRole(String role);

    long countByRole(String role);

    List<User> findByRoleAndIsOnlineTrue(String role);

    Optional<User> findByName(String name);

}
