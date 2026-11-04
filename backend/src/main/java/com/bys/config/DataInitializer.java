package com.bys.config;

import com.bys.entity.User;
import com.bys.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the demo account on startup if it doesn't exist.
 * WHY in Java and not in the V2 SQL seed? The password must be hashed with the
 * same PasswordEncoder the app uses to check logins.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String fullName;

    public DataInitializer(UserRepository users, PasswordEncoder passwordEncoder,
                           @Value("${app.demo-user.email}") String email,
                           @Value("${app.demo-user.password}") String password,
                           @Value("${app.demo-user.full-name}") String fullName) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!users.existsByEmail(email)) {
            users.save(new User(email, passwordEncoder.encode(password), fullName));
            log.info("Created demo user {}", email);
        }
    }
}
