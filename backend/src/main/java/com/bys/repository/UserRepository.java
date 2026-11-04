package com.bys.repository;

import com.bys.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * A repository is the ONLY layer that talks to the database.
 *
 * WHY just an interface with no code? Spring Data JPA generates the class at
 * startup. JpaRepository<User, Long> already gives us save(), findById(),
 * findAll(), delete()... and Spring turns method NAMES into SQL:
 *   findByEmail(email)  ->  SELECT * FROM users WHERE email = ?
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
}
