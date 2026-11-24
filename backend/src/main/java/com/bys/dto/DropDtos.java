package com.bys.dto;

import java.time.Instant;

public final class DropDtos {
    private DropDtos() {}

    /**
     * Everything the Drop Room screen needs in one response.
     * serverTime lets the browser correct for a wrong local clock when it counts down.
     */
    public record DropStatusDto(
            Long dropId,
            Long showId,
            String state,          // UPCOMING | OPEN
            Instant opensAt,
            Instant serverTime,
            long waitingCount,     // fans in the waiting room (before opening)
            long queueLength,      // fans in the line (after opening)
            long admittedCount,    // how many have been let in so far
            int batchSize,
            int windowSeconds,
            YouDto you) {}

    /** The current user's place in all this (null when not logged in). */
    public record YouDto(
            boolean joined,
            Integer position,      // 1-based place in line, once the drop is open
            Long peopleAhead,
            boolean admitted,      // holds a pass right now -> may pick seats
            Instant passExpiresAt,
            boolean missed) {}     // their turn came and went without holding seats

    /** Lists use this to badge shows that sell through a drop. */
    public record DropSummaryDto(Long showId, Instant opensAt, String state) {}
}
