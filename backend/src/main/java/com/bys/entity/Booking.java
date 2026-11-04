package com.bys.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * A user's order for one or more seats in one show.
 *
 * Lifecycle (Phase 4):  PENDING --pay--> CONFIRMED
 *                          |----cancel--> CANCELLED
 *                          '----5 min---> EXPIRED
 */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id")
    private Show show;

    /*
     * Many-to-many through the booking_seats join table:
     * a booking has many seats; over time a seat can appear in several bookings
     * (e.g. an EXPIRED one and later a CONFIRMED one).
     */
    @ManyToMany
    @JoinTable(
            name = "booking_seats",
            joinColumns = @JoinColumn(name = "booking_id"),
            inverseJoinColumns = @JoinColumn(name = "seat_id"))
    @OrderBy("rowLabel ASC, seatNumber ASC")
    private List<Seat> seats = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    protected Booking() {}

    /** Factory method: a new booking always starts as PENDING with a deadline. */
    public static Booking pending(User user, Show show, List<Seat> seats, Instant expiresAt) {
        Booking b = new Booking();
        b.user = user;
        b.show = show;
        b.seats = new ArrayList<>(seats);
        b.status = BookingStatus.PENDING;
        b.totalAmount = seats.stream().map(Seat::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        b.expiresAt = expiresAt;
        return b;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Show getShow() { return show; }
    public List<Seat> getSeats() { return seats; }
    public BookingStatus getStatus() { return status; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }

    public boolean isExpired(Instant now) {
        return expiresAt != null && now.isAfter(expiresAt);
    }

    public void confirm() { this.status = BookingStatus.CONFIRMED; this.expiresAt = null; }
    public void cancel() { this.status = BookingStatus.CANCELLED; }
    public void expire() { this.status = BookingStatus.EXPIRED; }
}
