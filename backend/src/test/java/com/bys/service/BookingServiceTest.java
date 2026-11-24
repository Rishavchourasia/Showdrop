package com.bys.service;

import com.bys.dto.BookingDtos.CreateBookingRequest;
import com.bys.entity.Booking;
import com.bys.entity.Event;
import com.bys.entity.Seat;
import com.bys.entity.SeatStatus;
import com.bys.entity.Show;
import com.bys.entity.User;
import com.bys.exception.BadRequestException;
import com.bys.exception.ConflictException;
import com.bys.repository.BookingRepository;
import com.bys.repository.SeatRepository;
import com.bys.repository.ShowRepository;
import com.bys.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the booking rules, using Mockito "mocks" (fake repositories)
 * so we can test the LOGIC without a real Postgres or Redis.
 */
class BookingServiceTest {

    private final BookingRepository bookings = mock(BookingRepository.class);
    private final ShowRepository shows = mock(ShowRepository.class);
    private final SeatRepository seats = mock(SeatRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final SeatHoldService holds = mock(SeatHoldService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final DropService drops = mock(DropService.class); // no drop rules unless a test sets them

    private final BookingService service =
            new BookingService(bookings, shows, seats, users, holds, events, drops, 5);

    private final Show show = mock(Show.class);

    @BeforeEach
    void setUp() {
        Event event = mock(Event.class);
        when(event.getTitle()).thenReturn("Starfall");
        when(show.getId()).thenReturn(1L);
        when(show.getEvent()).thenReturn(event);
        when(shows.findById(1L)).thenReturn(Optional.of(show));
        when(users.getReferenceById(7L)).thenReturn(mock(User.class));
        when(bookings.saveAndFlush(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static Seat seat(long id, String row, int number, SeatStatus status) {
        Seat s = mock(Seat.class);
        when(s.getId()).thenReturn(id);
        when(s.getRowLabel()).thenReturn(row);
        when(s.getSeatNumber()).thenReturn(number);
        when(s.getLabel()).thenReturn(row + number);
        when(s.getStatus()).thenReturn(status);
        when(s.getPrice()).thenReturn(new BigDecimal("200.00"));
        when(s.getCategory()).thenReturn(com.bys.entity.SeatCategory.REGULAR);
        return s;
    }

    @Test
    void holdsSeatsAndReturnsPendingBookingWithTotal() {
        // (Build mocks BEFORE when(...): creating a mock inside thenReturn confuses Mockito.)
        List<Seat> found = List.of(seat(10, "A", 1, SeatStatus.AVAILABLE), seat(11, "A", 2, SeatStatus.AVAILABLE));
        when(seats.findByShowIdAndIdIn(eq(1L), anyList())).thenReturn(found);
        when(holds.holdAll(eq(1L), eq(List.of(10L, 11L)), anyString(), any())).thenReturn(true);

        var dto = service.create(7L, new CreateBookingRequest(1L, List.of(11L, 10L, 10L)));

        assertThat(dto.status()).isEqualTo("PENDING");
        assertThat(dto.totalAmount()).isEqualByComparingTo("400.00");
        assertThat(dto.expiresAt()).isNotNull();
    }

    @Test
    void rejectsSeatsThatDoNotBelongToTheShow() {
        List<Seat> found = List.of(seat(10, "A", 1, SeatStatus.AVAILABLE));
        when(seats.findByShowIdAndIdIn(eq(1L), anyList())).thenReturn(found);

        assertThatThrownBy(() -> service.create(7L, new CreateBookingRequest(1L, List.of(10L, 999L))))
                .isInstanceOf(BadRequestException.class);
        verifyNoInteractions(holds);
    }

    @Test
    void rejectsAlreadyBookedSeats() {
        List<Seat> found = List.of(seat(10, "A", 1, SeatStatus.BOOKED));
        when(seats.findByShowIdAndIdIn(eq(1L), anyList())).thenReturn(found);

        assertThatThrownBy(() -> service.create(7L, new CreateBookingRequest(1L, List.of(10L))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("A1");
    }

    @Test
    void conflictsWhenAnotherCustomerHoldsTheSeat() {
        List<Seat> found = List.of(seat(10, "A", 1, SeatStatus.AVAILABLE));
        when(seats.findByShowIdAndIdIn(eq(1L), anyList())).thenReturn(found);
        when(holds.holdAll(anyLong(), anyList(), anyString(), any())).thenReturn(false); // Redis SET NX lost the race

        assertThatThrownBy(() -> service.create(7L, new CreateBookingRequest(1L, List.of(10L))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("held by another customer");
    }

    @Test
    void dropShowRefusesHoldWhenItIsNotYourTurn() {
        doThrow(new ConflictException("It's not your turn yet.")).when(drops).requireTurn(1L, 7L);

        assertThatThrownBy(() -> service.create(7L, new CreateBookingRequest(1L, List.of(10L))))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("not your turn");
        verifyNoInteractions(holds); // refused before any seat was touched
    }

    @Test
    void successfulHoldUsesUpTheDropPass() {
        List<Seat> found = List.of(seat(10, "A", 1, SeatStatus.AVAILABLE));
        when(seats.findByShowIdAndIdIn(eq(1L), anyList())).thenReturn(found);
        when(holds.holdAll(anyLong(), anyList(), anyString(), any())).thenReturn(true);

        service.create(7L, new CreateBookingRequest(1L, List.of(10L)));

        verify(drops).usePass(1L, 7L); // frees the slot for the next person in line
    }
}
