package com.bys.notifications;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * Consumes "booking.confirmed" events and "sends the ticket".
 *
 * In a real system this is where you'd call an email/SMS provider, generate a
 * PDF ticket with a QR code, etc. Those can be slow or flaky -- which is exactly
 * why they live HERE, decoupled from the booking request:
 *   - the user's "Pay" click returns instantly; it never waits for email
 *   - if this service is down, messages wait safely in Kafka and are processed
 *     when it comes back (try it: stop this container, book, start it again)
 *   - new consumers (analytics, loyalty points...) can subscribe to the same
 *     topic later without changing the booking code at all
 *
 * After this method returns successfully, Spring commits the consumer OFFSET
 * ("I've processed up to message N"). If it throws, the message is retried.
 */
@Component
public class BookingConfirmedListener {

    private static final Logger log = LoggerFactory.getLogger(BookingConfirmedListener.class);

    @KafkaListener(topics = "booking.confirmed")
    public void onBookingConfirmed(ConsumerRecord<String, BookingConfirmedMessage> record) {
        BookingConfirmedMessage m = record.value();
        if (m == null) {
            log.warn("Skipping unreadable message at partition {} offset {}", record.partition(), record.offset());
            return;
        }
        log.info("""

                =====================  TICKET SENT  =====================
                  To:       {} <{}>
                  Booking:  #{}
                  Event:    {}
                  Venue:    {}, {}
                  Starts:   {}
                  Seats:    {}
                  Paid:     Rs. {}
                  (kafka partition {}, offset {})
                =========================================================""",
                m.userName(), m.userEmail(), m.bookingId(), m.eventTitle(), m.venueName(), m.city(),
                m.showStartTime(), String.join(", ", m.seats()), m.totalAmount(),
                record.partition(), record.offset());
    }
}
