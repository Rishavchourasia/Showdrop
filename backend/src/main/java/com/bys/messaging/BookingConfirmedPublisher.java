package com.bys.messaging;

import com.bys.service.SeatHoldService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Runs AFTER the booking transaction has successfully COMMITTED to Postgres.
 *
 * WHY after commit? If we published to Kafka inside the transaction and the DB
 * commit then failed (e.g. optimistic-lock conflict), the user would get a
 * "ticket sent" notification for a booking that doesn't exist. Waiting for the
 * commit guarantees we only announce things that really happened.
 *
 * (The remaining gap -- DB committed but the app crashed before sending -- is
 * solved in production with the "transactional outbox" pattern. Out of scope here.)
 */
@Component
public class BookingConfirmedPublisher {

    private static final Logger log = LoggerFactory.getLogger(BookingConfirmedPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SeatHoldService seatHoldService;

    public BookingConfirmedPublisher(KafkaTemplate<String, Object> kafkaTemplate, SeatHoldService seatHoldService) {
        this.kafkaTemplate = kafkaTemplate;
        this.seatHoldService = seatHoldService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBookingConfirmed(BookingConfirmedEvent event) {
        // 1. The seats are now permanently BOOKED in Postgres, so the temporary Redis holds can go.
        try {
            seatHoldService.release(event.showId(), event.seatIds(), event.holdOwner());
        } catch (RuntimeException e) {
            log.warn("Could not release Redis holds (they will expire on their own): {}", e.getMessage());
        }

        // 2. Tell the world. send() is ASYNCHRONOUS: it returns immediately and the
        //    user's HTTP response does not wait for the notification to be sent.
        BookingConfirmedMessage msg = event.message();
        kafkaTemplate.send(KafkaTopics.BOOKING_CONFIRMED, String.valueOf(msg.bookingId()), msg)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish booking.confirmed for booking {}", msg.bookingId(), ex);
                    } else {
                        log.info("Published booking.confirmed for booking {} (partition {}, offset {})",
                                msg.bookingId(), result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
