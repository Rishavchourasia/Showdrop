package com.bys.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class EventDtos {
    private EventDtos() {}

    /** Used in the events list -- small on purpose (no description, no shows). */
    public record EventSummaryDto(Long id, String title, String category, String language,
                                  int durationMinutes, String posterUrl) {}

    public record ShowSummaryDto(Long id, String venueName, String city, Instant startTime) {}

    public record EventDetailDto(Long id, String title, String description, String category, String language,
                                 int durationMinutes, String posterUrl, List<ShowSummaryDto> shows) {}

    /**
     * status is a String here, not the SeatStatus enum, because the API shows a
     * COMBINED view: AVAILABLE / BOOKED come from Postgres, HELD comes from Redis.
     */
    public record SeatDto(Long id, String rowLabel, int seatNumber, String category,
                          BigDecimal price, String status) {}

    public record ShowDetailDto(Long id, EventSummaryDto event, String venueName, String city,
                                Instant startTime, int holdMinutes, List<SeatDto> seats) {}
}
