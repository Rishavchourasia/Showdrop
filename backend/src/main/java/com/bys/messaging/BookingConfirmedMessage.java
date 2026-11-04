package com.bys.messaging;

import java.math.BigDecimal;
import java.util.List;

/**
 * PHASE 5 -- The payload published to the Kafka topic "booking.confirmed".
 *
 * This is a CONTRACT between services: the notifications service has its own
 * copy of this shape. Treat it like a public API -- adding fields is fine,
 * renaming/removing them breaks consumers. Times are ISO-8601 strings so any
 * language can read them.
 */
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
