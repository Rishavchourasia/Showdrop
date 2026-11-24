package com.bys.messaging;

/** Published to "drop.opened" the moment a drop goes live. Times are ISO-8601 strings. */
public record DropOpenedMessage(
        Long dropId,
        Long showId,
        String eventTitle,
        String venueName,
        String city,
        long fansInLine,
        String openedAt) {
}
