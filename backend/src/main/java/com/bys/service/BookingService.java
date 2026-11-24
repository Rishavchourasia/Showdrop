package com.bys.service;

import com.bys.dto.BookingDtos.BookingDto;
import com.bys.dto.BookingDtos.CreateBookingRequest;
import com.bys.entity.Booking;
import com.bys.entity.BookingStatus;
import com.bys.entity.Seat;
import com.bys.entity.SeatStatus;
import com.bys.entity.Show;
import com.bys.entity.User;
import com.bys.exception.BadRequestException;
import com.bys.exception.ConflictException;
import com.bys.exception.NotFoundException;
import com.bys.messaging.BookingConfirmedEvent;
import com.bys.messaging.BookingConfirmedMessage;
import com.bys.repository.BookingRepository;
import com.bys.repository.SeatRepository;
import com.bys.repository.ShowRepository;
import com.bys.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * The heart of the app: the booking flow.
 *
 *   1. POST /api/bookings              -> create()   seats HELD in Redis, booking PENDING
 *   2. POST /api/bookings/{id}/confirm -> confirm()  "payment" -> seats BOOKED in Postgres,
 *                                                     booking CONFIRMED, Kafka event sent
 *      DELETE /api/bookings/{id}       -> cancel()   give the seats back early
 *      (no action for 5 min)           -> expireStale() marks it EXPIRED; Redis frees the seats
 *
 * @Transactional: everything inside the method is ONE database transaction.
 * Either all changes are saved, or (if an exception is thrown) none are.
 */
@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookings;
    private final ShowRepository shows;
    private final SeatRepository seats;
    private final UserRepository users;
    private final SeatHoldService seatHolds;
    private final ApplicationEventPublisher eventPublisher;
    private final DropService drops;
    private final Duration holdDuration;

    public BookingService(BookingRepository bookings, ShowRepository shows, SeatRepository seats,
                          UserRepository users, SeatHoldService seatHolds, ApplicationEventPublisher eventPublisher,
                          DropService drops, @Value("${app.booking.hold-minutes}") int holdMinutes) {
        this.bookings = bookings;
        this.shows = shows;
        this.seats = seats;
        this.users = users;
        this.seatHolds = seatHolds;
        this.eventPublisher = eventPublisher;
        this.drops = drops;
        this.holdDuration = Duration.ofMinutes(holdMinutes);
    }

    /** Step 1: start checkout. Holds the seats for `holdDuration`. */
    @Transactional
    public BookingDto create(Long userId, CreateBookingRequest req) {
        List<Long> seatIds = req.seatIds().stream().distinct().sorted().toList();

        Show show = shows.findById(req.showId())
                .orElseThrow(() -> new NotFoundException("Show " + req.showId() + " not found"));

        // Shows that sell through a Drop: only people whose turn it is (holding a pass) may hold seats.
        drops.requireTurn(show.getId(), userId);

        List<Seat> requested = seats.findByShowIdAndIdIn(show.getId(), seatIds);
        if (requested.size() != seatIds.size()) {
            throw new BadRequestException("One or more seats do not belong to this show.");
        }

        List<String> alreadyBooked = requested.stream()
                .filter(s -> s.getStatus() == SeatStatus.BOOKED).map(Seat::getLabel).toList();
        if (!alreadyBooked.isEmpty()) {
            throw new ConflictException("Already booked: " + String.join(", ", alreadyBooked));
        }

        // Save first so we have a booking id to use as the hold "owner" value in Redis.
        User user = users.getReferenceById(userId); // a lightweight reference; no SELECT needed
        Booking booking = bookings.saveAndFlush(
                Booking.pending(user, show, requested, Instant.now().plus(holdDuration)));

        // The race-condition guard. Redis SET NX lets exactly one customer win each seat.
        // If we lose, throwing an exception rolls back the PENDING booking we just inserted.
        if (!seatHolds.holdAll(show.getId(), seatIds, holdOwner(booking), holdDuration)) {
            throw new ConflictException(
                    "Some of these seats are being held by another customer. Pick different seats or try again in a few minutes.");
        }

        drops.usePass(show.getId(), userId); // turn used: let the next person in line in

        log.info("Booking {} PENDING: user {} holds seats {} for {} min",
                booking.getId(), userId, labels(requested), holdDuration.toMinutes());
        return DtoMapper.toDto(booking);
    }

    /** Step 2: "pay". In a real app this would be called after the payment gateway says OK. */
    @Transactional
    public BookingDto confirm(Long userId, Long bookingId) {
        Booking booking = bookings.findForUser(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking " + bookingId + " not found"));

        // Idempotent: a double-clicked "Pay" button shouldn't produce an error.
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return DtoMapper.toDto(booking);
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ConflictException("This booking is " + booking.getStatus().name().toLowerCase(Locale.ROOT) + ".");
        }

        Long showId = booking.getShow().getId();
        List<Long> seatIds = booking.getSeats().stream().map(Seat::getId).toList();

        // Is the hold still ours? If 5 minutes passed, Redis has deleted the keys and
        // someone else may already hold these seats.
        if (booking.isExpired(Instant.now()) || !seatHolds.isHeldByAll(showId, seatIds, holdOwner(booking))) {
            throw new ConflictException("Your " + holdDuration.toMinutes()
                    + "-minute hold has expired. Please select your seats again.");
        }

        for (Seat seat : booking.getSeats()) {
            if (seat.getStatus() == SeatStatus.BOOKED) {
                throw new ConflictException("Seat " + seat.getLabel() + " is no longer available.");
            }
            seat.markBooked();
        }
        booking.confirm();

        // flush() sends the UPDATEs now. If another transaction changed one of these
        // seats since we read it, the @Version check fails here -> 409 Conflict.
        bookings.saveAndFlush(booking);

        // Not sent yet! Delivered to BookingConfirmedPublisher only AFTER the commit succeeds.
        eventPublisher.publishEvent(new BookingConfirmedEvent(showId, seatIds, holdOwner(booking), toMessage(booking)));

        log.info("Booking {} CONFIRMED: seats {}", booking.getId(), labels(booking.getSeats()));
        return DtoMapper.toDto(booking);
    }

    /** Give up during checkout: release the seats right away instead of waiting 5 minutes. */
    @Transactional
    public BookingDto cancel(Long userId, Long bookingId) {
        Booking booking = bookings.findForUser(bookingId, userId)
                .orElseThrow(() -> new NotFoundException("Booking " + bookingId + " not found"));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ConflictException("Only bookings that are still in checkout can be cancelled.");
        }
        booking.cancel();
        seatHolds.release(booking.getShow().getId(),
                booking.getSeats().stream().map(Seat::getId).toList(), holdOwner(booking));
        return DtoMapper.toDto(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> myBookings(Long userId) {
        return bookings.findAllForUser(userId).stream().map(DtoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public BookingDto getMine(Long userId, Long bookingId) {
        return bookings.findForUser(bookingId, userId).map(DtoMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Booking " + bookingId + " not found"));
    }

    /**
     * Housekeeping: every 30s, flip PENDING bookings past their deadline to EXPIRED.
     * (The seats are already free -- Redis expired the hold keys by itself. This
     * just keeps the bookings table honest for "My bookings".)
     */
    @Scheduled(fixedDelay = 30_000, initialDelay = 30_000)
    @Transactional
    public void expireStale() {
        List<Booking> stale = bookings.findExpired(BookingStatus.PENDING, Instant.now());
        stale.forEach(Booking::expire);
        if (!stale.isEmpty()) {
            log.info("Expired {} unpaid booking(s)", stale.size());
        }
    }

    private static String holdOwner(Booking b) {
        return "booking:" + b.getId();
    }

    private static List<String> labels(List<Seat> seats) {
        return seats.stream().map(Seat::getLabel).toList();
    }

    private static BookingConfirmedMessage toMessage(Booking b) {
        Show show = b.getShow();
        User user = b.getUser();
        return new BookingConfirmedMessage(b.getId(), user.getId(), user.getEmail(), user.getFullName(),
                show.getEvent().getTitle(), show.getVenueName(), show.getCity(), show.getStartTime().toString(),
                labels(b.getSeats()), b.getTotalAmount(), Instant.now().toString());
    }
}
