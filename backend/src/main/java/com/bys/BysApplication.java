package com.bys;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point. {@code @SpringBootApplication} tells Spring to scan this package
 * (and sub-packages) for classes annotated with @Component, @Service,
 * @RestController, @Repository, @Configuration... create one instance of each
 * and wire them together ("dependency injection").
 *
 * WHY dependency injection? Classes ask for what they need in their constructor
 * (e.g. BookingService needs a BookingRepository) instead of creating it
 * themselves. That keeps classes small and lets tests pass in fakes.
 *
 * {@code @EnableScheduling} turns on @Scheduled methods (we use one to expire
 * unpaid bookings).
 */
@SpringBootApplication
@EnableScheduling
public class BysApplication {
    public static void main(String[] args) {
        SpringApplication.run(BysApplication.class, args);
    }
}
