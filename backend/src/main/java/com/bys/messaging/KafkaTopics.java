package com.bys.messaging;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/**
 * PHASE 5 -- Declares our Kafka topics. Spring's KafkaAdmin creates them on
 * startup if they don't exist yet.
 *
 * A TOPIC is a named, append-only log of messages. Producers append; each
 * consumer GROUP reads at its own pace and remembers its position (offset).
 * PARTITIONS let several consumer instances share the work; messages with the
 * same KEY (we use bookingId) always land in the same partition, in order.
 */
@Configuration
public class KafkaTopics {

    public static final String BOOKING_CONFIRMED = "booking.confirmed";

    @Bean
    public NewTopic bookingConfirmedTopic() {
        return TopicBuilder.name(BOOKING_CONFIRMED).partitions(3).replicas(1).build();
    }
}
