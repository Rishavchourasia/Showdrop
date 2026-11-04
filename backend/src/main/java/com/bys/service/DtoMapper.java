package com.bys.service;

import com.bys.dto.AuthDtos.UserDto;
import com.bys.dto.BookingDtos.BookedSeatDto;
import com.bys.dto.BookingDtos.BookingDto;
import com.bys.dto.EventDtos.EventSummaryDto;
import com.bys.dto.EventDtos.ShowSummaryDto;
import com.bys.entity.Booking;
import com.bys.entity.Event;
import com.bys.entity.Seat;
import com.bys.entity.Show;
import com.bys.entity.User;

/**
 * Converts entities (DB shape) into DTOs (API shape). Kept in one place so the
 * mapping rules aren't copy-pasted around the services.
 */
final class DtoMapper {
    private DtoMapper() {}

    static UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFullName());
    }

    static EventSummaryDto toSummary(Event e) {
        return new EventSummaryDto(e.getId(), e.getTitle(), e.getCategory(), e.getLanguage(),
                e.getDurationMinutes(), e.getPosterUrl());
    }

    static ShowSummaryDto toSummary(Show s) {
        return new ShowSummaryDto(s.getId(), s.getVenueName(), s.getCity(), s.getStartTime());
    }

    static BookedSeatDto toBookedSeat(Seat s) {
        return new BookedSeatDto(s.getId(), s.getRowLabel(), s.getSeatNumber(), s.getCategory().name(), s.getPrice());
    }

    static BookingDto toDto(Booking b) {
        Event event = b.getShow().getEvent();
        return new BookingDto(b.getId(), b.getStatus().name(), b.getTotalAmount(), b.getCreatedAt(),
                b.getExpiresAt(), event.getId(), event.getTitle(), event.getPosterUrl(), toSummary(b.getShow()),
                b.getSeats().stream().map(DtoMapper::toBookedSeat).toList());
    }
}
