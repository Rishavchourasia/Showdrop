package com.bys.controller;

import com.bys.dto.BookingDtos.BookingDto;
import com.bys.dto.BookingDtos.CreateBookingRequest;
import com.bys.security.AuthUser;
import com.bys.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * All routes here require a valid JWT (see SecurityConfig).
 * @AuthenticationPrincipal injects the AuthUser that JwtAuthFilter put into the
 * security context -- so we always use the id FROM THE TOKEN, never a userId
 * sent in the request body (which a user could fake).
 */
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    /** POST /api/bookings {showId, seatIds} -> 201 PENDING booking; seats held for 5 minutes. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody CreateBookingRequest request) {
        return bookingService.create(user.id(), request);
    }

    /** POST /api/bookings/{id}/confirm -> simulate payment; booking becomes CONFIRMED. */
    @PostMapping("/{id}/confirm")
    public BookingDto confirm(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return bookingService.confirm(user.id(), id);
    }

    /** DELETE /api/bookings/{id} -> cancel a PENDING booking and release its seats. */
    @DeleteMapping("/{id}")
    public BookingDto cancel(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return bookingService.cancel(user.id(), id);
    }

    /** GET /api/bookings/me -> my bookings, newest first. */
    @GetMapping("/me")
    public List<BookingDto> mine(@AuthenticationPrincipal AuthUser user) {
        return bookingService.myBookings(user.id());
    }

    /** GET /api/bookings/{id} -> one of my bookings (used by the checkout page). */
    @GetMapping("/{id}")
    public BookingDto get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return bookingService.getMine(user.id(), id);
    }
}
