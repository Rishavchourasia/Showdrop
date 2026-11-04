package com.bys.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * PHASE 4 -- Temporary seat holds ("locks") in Redis.
 *
 * THE PROBLEM: Alice and Bob both open the 6pm show, both see A5 as free, both
 * click it. Checkout takes a few minutes (payment). Without a hold, both reach
 * the payment page and one of them pays for a seat that's gone.
 *
 * THE SOLUTION: when you start checkout we write a key in Redis:
 *     seat-hold:{showId}:{seatId}  =  "booking:{bookingId}"   (expires in 5 min)
 * using SET ... NX ("only if Not eXists"). Redis executes commands one at a time,
 * so if Alice and Bob send SET NX at the same moment, exactly ONE succeeds.
 * Bob gets "seat is being held" immediately -- before he enters card details.
 *
 * WHY THE TTL (auto-expiry)? If Alice closes her laptop and never pays, nobody
 * has to remember to clean up: Redis deletes the key after 5 minutes and the
 * seat is free again. No stuck seats, even if our server crashes.
 *
 * WHY NOT just a column in Postgres? We could, but then we'd need a cleanup job
 * to un-hold seats, and every page view would hit the DB. Redis gives atomic
 * "set if absent" + built-in expiry + memory speed.
 *
 * Postgres remains the source of truth for PERMANENT bookings (status=BOOKED
 * with optimistic locking). Redis only guards the short checkout window.
 */
@Service
public class SeatHoldService {

    /*
     * "Delete the key only if it still holds MY value." Done in a Lua script
     * because Redis runs a script atomically. A plain GET-then-DEL from Java
     * could delete someone else's hold if ours expired in between.
     */
    private static final DefaultRedisScript<Long> RELEASE_IF_OWNER = new DefaultRedisScript<>("""
            local released = 0
            for _, key in ipairs(KEYS) do
              if redis.call('GET', key) == ARGV[1] then
                released = released + redis.call('DEL', key)
              end
            end
            return released
            """, Long.class);

    private final StringRedisTemplate redis;

    public SeatHoldService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    static String key(Long showId, Long seatId) {
        return "seat-hold:" + showId + ":" + seatId;
    }

    /**
     * Try to hold ALL the seats. All-or-nothing: if any one is already held, we
     * release the ones we just grabbed and return false.
     */
    public boolean holdAll(Long showId, List<Long> seatIds, String owner, Duration ttl) {
        List<Long> acquired = new ArrayList<>();
        for (Long seatId : seatIds) {
            Boolean ok = redis.opsForValue().setIfAbsent(key(showId, seatId), owner, ttl); // SET key owner NX EX ttl
            if (Boolean.TRUE.equals(ok)) {
                acquired.add(seatId);
            } else {
                release(showId, acquired, owner);
                return false;
            }
        }
        return true;
    }

    /** Does `owner` still hold every one of these seats? (False if any hold expired.) */
    public boolean isHeldByAll(Long showId, List<Long> seatIds, String owner) {
        List<String> values = redis.opsForValue().multiGet(keys(showId, seatIds)); // one round trip: MGET
        return values != null && values.stream().allMatch(owner::equals);
    }

    /** Which of these seats are currently held by anyone? Used to draw the seat map. */
    public Set<Long> heldSeatIds(Long showId, List<Long> seatIds) {
        Set<Long> held = new HashSet<>();
        if (seatIds.isEmpty()) return held;
        List<String> values = redis.opsForValue().multiGet(keys(showId, seatIds));
        if (values == null) return held;
        for (int i = 0; i < seatIds.size(); i++) {
            if (Objects.nonNull(values.get(i))) held.add(seatIds.get(i));
        }
        return held;
    }

    public void release(Long showId, List<Long> seatIds, String owner) {
        if (seatIds.isEmpty()) return;
        redis.execute(RELEASE_IF_OWNER, keys(showId, seatIds), owner);
    }

    private static List<String> keys(Long showId, List<Long> seatIds) {
        return seatIds.stream().map(id -> key(showId, id)).toList();
    }
}
