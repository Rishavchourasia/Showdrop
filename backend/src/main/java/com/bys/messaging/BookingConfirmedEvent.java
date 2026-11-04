package com.bys.messaging;

import java.util.List;

/**
 * An IN-PROCESS Spring event (not Kafka!) fired by BookingService when a
 * booking is confirmed. It carries what the after-commit listener needs:
 * which Redis holds to release, and the Kafka message to send.
 */
public record BookingConfirmedEvent(Long showId, List<Long> seatIds, String holdOwner,
                                    BookingConfirmedMessage message) {
}
