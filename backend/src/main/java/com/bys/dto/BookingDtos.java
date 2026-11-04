package com.bys.dto;

import com.bys.dto.EventDtos.ShowSummaryDto;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class BookingDtos {
    private BookingDtos() {}

    /** Body of POST /api/bookings -- "hold these seats for me". */
    public record CreateBookingRequest(
            @NotNull Long showId,
            @NotEmpty @Size(max = 10, message = "you can book at most 10 seats at once") List<@NotNull Long> seatIds) {}

    public record BookedSeatDto(Long id, String rowLabel, int seatNumber, String category, BigDecimal price) {}

    public record BookingDto(Long id, String status, BigDecimal totalAmount, Instant createdAt, Instant expiresAt,
                             Long eventId, String eventTitle, String posterUrl, ShowSummaryDto show,
                             List<BookedSeatDto> seats) {}
}
