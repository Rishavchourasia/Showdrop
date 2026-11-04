package com.bys.notifications;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

/**
 * This service's OWN copy of the "booking.confirmed" message shape.
 *
 * WHY a copy instead of importing the backend's class? Services should be
 * deployable independently. Sharing code would tie their release cycles
 * together. They share a data CONTRACT (the JSON fields) instead.
 *
 * @JsonIgnoreProperties(ignoreUnknown = true): if the backend later ADDS a field,
 * this consumer keeps working instead of failing. That's how contracts evolve safely.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BookingConfirmedMessage(
        Long bookingId,
        Long userId,
        String userEmail,
        String userName,
        String eventTitle,
        String venueName,
        String city,
        String showStartTime,
        List<String> seats,
        BigDecimal totalAmount,
        String confirmedAt) {
}
