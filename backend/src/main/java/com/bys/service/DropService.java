package com.bys.service;

import com.bys.dto.DropDtos.DropStatusDto;
import com.bys.dto.DropDtos.DropSummaryDto;
import com.bys.dto.DropDtos.YouDto;
import com.bys.entity.Drop;
import com.bys.entity.DropStatus;
import com.bys.entity.Show;
import com.bys.exception.ConflictException;
import com.bys.exception.NotFoundException;
import com.bys.messaging.DropOpenedMessage;
import com.bys.messaging.KafkaTopics;
import com.bys.repository.DropRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations.TypedTuple;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/*
 * THE DROP ROOM: a fair, timed on-sale for a show.
 *
 * THE PROBLEM with "first come, first served" for a hot show: whoever refreshes
 * fastest (or runs a bot) wins, and the server gets hammered at the exact
 * second of the sale. THE FIX here:
 *
 *   1. Before the drop, fans JOIN a waiting room. Joining early gives no advantage.
 *   2. At opensAt, everyone waiting is SHUFFLED (SecureRandom) into a random line.
 *      People who join after that go to the back.
 *   3. Fans are let in `batchSize` at a time. Each gets a PASS that lasts
 *      `windowSeconds` to pick seats. Holding seats (or the pass running out)
 *      frees a slot, and the next person in line is let in.
 *   4. BookingService refuses to hold seats for anyone without a pass, so the
 *      line can't be skipped by calling the API directly.
 *
 * WHERE THINGS LIVE: the schedule is in Postgres (drops table). The fast-moving
 * state is in Redis, under keys starting with "drop:{id}:":
 *   waiting       SET   user ids in the waiting room (before opening)
 *   queue         ZSET  user id -> ticket number (lower = earlier in line)
 *   seq           STR   the next ticket number for latecomers
 *   cursor        STR   the lowest ticket number not yet let in
 *   active        SET   user ids currently holding a pass
 *   pass:{userId} STR   pass expiry (epoch ms), auto-deleted by Redis TTL
 *   lock          STR   short lock so only ONE backend replica opens/advances a drop
 */
@Service
public class DropService {

    private static final Logger log = LoggerFactory.getLogger(DropService.class);
    private static final SecureRandom RANDOM = new SecureRandom(); // unpredictable, unlike java.util.Random
    private static final DateTimeFormatter CLOCK =
            DateTimeFormatter.ofPattern("h:mm a").withZone(ZoneId.of("Asia/Kolkata"));

    private final DropRepository drops;
    private final StringRedisTemplate redis;
    private final KafkaTemplate<String, Object> kafka;

    public DropService(DropRepository drops, StringRedisTemplate redis, KafkaTemplate<String, Object> kafka) {
        this.drops = drops;
        this.redis = redis;
        this.kafka = kafka;
    }

    // ---------------------------------------------------------------- keys
    private static String key(Long dropId, String part) {
        return "drop:" + dropId + ":" + part;
    }

    private static String passKey(Long dropId, Long userId) {
        return key(dropId, "pass:" + userId);
    }

    private long readLong(String k) {
        String v = redis.opsForValue().get(k);
        return v == null ? 0 : Long.parseLong(v);
    }

    // ---------------------------------------------------------------- reads
    public List<DropSummaryDto> summaries() {
        return drops.findAll().stream()
                .map(d -> new DropSummaryDto(d.getShow().getId(), d.getOpensAt(), stateOf(d)))
                .toList();
    }

    private static String stateOf(Drop d) {
        return d.getStatus() == DropStatus.OPEN ? "OPEN" : "UPCOMING";
    }

    /** The Drop Room's view of a show; empty if the show has no drop. userId may be null (logged out). */
    public Optional<DropStatusDto> status(Long showId, Long userId) {
        return drops.findByShowId(showId).map(d -> toStatus(d, userId));
    }

    private DropStatusDto toStatus(Drop d, Long userId) {
        Long id = d.getId();
        Long waiting = redis.opsForSet().size(key(id, "waiting"));
        Long queued = redis.opsForZSet().size(key(id, "queue"));
        long cursor = readLong(key(id, "cursor"));
        Long admitted = redis.opsForZSet().count(key(id, "queue"), Double.NEGATIVE_INFINITY, cursor - 1);
        return new DropStatusDto(id, d.getShow().getId(), stateOf(d), d.getOpensAt(), Instant.now(),
                waiting == null ? 0 : waiting, queued == null ? 0 : queued, admitted == null ? 0 : admitted,
                d.getBatchSize(), d.getWindowSeconds(), userId == null ? null : you(d, userId, cursor));
    }

    private YouDto you(Drop d, Long userId, long cursor) {
        Long id = d.getId();
        String member = userId.toString();
        if (d.getStatus() == DropStatus.SCHEDULED) {
            boolean joined = Boolean.TRUE.equals(redis.opsForSet().isMember(key(id, "waiting"), member));
            return new YouDto(joined, null, null, false, null, false);
        }
        Double ticket = redis.opsForZSet().score(key(id, "queue"), member);
        if (ticket == null) return new YouDto(false, null, null, false, null, false);

        Long rank = redis.opsForZSet().rank(key(id, "queue"), member);
        String pass = redis.opsForValue().get(passKey(id, userId));
        boolean admitted = pass != null;
        boolean missed = !admitted && ticket < cursor; // their turn came and went
        Long ahead = admitted || missed ? 0L
                : redis.opsForZSet().count(key(id, "queue"), cursor, ticket - 1); // still waiting, in front of me
        return new YouDto(true, rank == null ? null : rank.intValue() + 1, ahead, admitted,
                admitted ? Instant.ofEpochMilli(Long.parseLong(pass)) : null, missed);
    }

    // ---------------------------------------------------------------- joining
    /** Get in line. Before the drop: the waiting room. After: the back of the queue (or again, if you missed your turn). */
    public DropStatusDto join(Long showId, Long userId) {
        Drop d = drops.findByShowId(showId).orElseThrow(() -> new NotFoundException("This show has no drop."));
        String member = userId.toString();
        if (d.getStatus() == DropStatus.SCHEDULED) {
            redis.opsForSet().add(key(d.getId(), "waiting"), member);
        } else {
            Double ticket = redis.opsForZSet().score(key(d.getId(), "queue"), member);
            boolean hasPass = Boolean.TRUE.equals(redis.hasKey(passKey(d.getId(), userId)));
            boolean missed = ticket != null && !hasPass && ticket < readLong(key(d.getId(), "cursor"));
            if (ticket == null || missed) {
                Long next = redis.opsForValue().increment(key(d.getId(), "seq")); // next ticket number at the back
                redis.opsForZSet().add(key(d.getId(), "queue"), member, next == null ? 0 : next);
            }
        }
        return toStatus(d, userId);
    }

    // ---------------------------------------------------------------- the gate used by BookingService
    /** Throws 409 unless this user may hold seats for this show right now. Shows without a drop are always open. */
    public void requireTurn(Long showId, Long userId) {
        Optional<Drop> maybe = drops.findByShowId(showId);
        if (maybe.isEmpty()) return;
        Drop d = maybe.get();
        if (d.getStatus() == DropStatus.SCHEDULED) {
            throw new ConflictException("Tickets for this show drop at " + CLOCK.format(d.getOpensAt())
                    + ". Join the Drop Room to get in line.");
        }
        if (!Boolean.TRUE.equals(redis.hasKey(passKey(d.getId(), userId)))) {
            throw new ConflictException("It's not your turn yet. Join the Drop Room line for this show.");
        }
    }

    /** After a successful hold the pass is used up, freeing a slot for the next person in line. */
    public void usePass(Long showId, Long userId) {
        drops.findByShowId(showId).ifPresent(d -> {
            redis.delete(passKey(d.getId(), userId));
            redis.opsForSet().remove(key(d.getId(), "active"), userId.toString());
        });
    }

    // ---------------------------------------------------------------- the clock
    /** Every second: open drops whose time has come, and let the next people in on open ones. */
    @Scheduled(fixedDelay = 1000, initialDelay = 5000)
    public void tick() {
        Instant now = Instant.now();
        for (Drop d : drops.findByStatus(DropStatus.SCHEDULED)) {
            if (!now.isBefore(d.getOpensAt()) && lock(d)) open(d, now);
        }
        for (Drop d : drops.findByStatus(DropStatus.OPEN)) {
            if (lock(d)) admit(d);
        }
    }

    /**
     * With 2+ backend replicas (Kubernetes), every replica runs this scheduler.
     * SET NX with a short expiry makes sure only ONE of them works on a drop per tick.
     */
    private boolean lock(Drop d) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(key(d.getId(), "lock"), "1", Duration.ofMillis(900)));
    }

    /** The moment of the drop: shuffle the waiting room into a random line. */
    private void open(Drop d, Instant now) {
        Long id = d.getId();
        Set<String> waiting = redis.opsForSet().members(key(id, "waiting"));
        List<String> line = new ArrayList<>(waiting == null ? Set.of() : waiting);
        Collections.shuffle(line, RANDOM); // the fairness: arrival order does not matter

        for (int i = 0; i < line.size(); i++) {
            redis.opsForZSet().add(key(id, "queue"), line.get(i), i);
        }
        redis.opsForValue().set(key(id, "seq"), String.valueOf(line.size() - 1)); // latecomers get line.size(), +1, ...
        redis.opsForValue().set(key(id, "cursor"), "0");
        redis.delete(key(id, "waiting"));

        d.markOpen(now);
        drops.save(d);
        log.info("Drop {} is OPEN: {} fans shuffled into the line", id, line.size());

        Show show = d.getShow();
        kafka.send(KafkaTopics.DROP_OPENED, String.valueOf(id), new DropOpenedMessage(id, show.getId(),
                show.getEvent().getTitle(), show.getVenueName(), show.getCity(), line.size(), now.toString()));
    }

    /** Keep `batchSize` people inside: drop expired passes, then let in the next in line. */
    private void admit(Drop d) {
        Long id = d.getId();
        Set<String> active = redis.opsForSet().members(key(id, "active"));
        if (active != null) {
            for (String userId : active) {
                if (!Boolean.TRUE.equals(redis.hasKey(passKey(id, Long.valueOf(userId))))) {
                    redis.opsForSet().remove(key(id, "active"), userId); // pass expired: their slot is free
                }
            }
        }
        Long inside = redis.opsForSet().size(key(id, "active"));
        long free = d.getBatchSize() - (inside == null ? 0 : inside);
        long cursor = readLong(key(id, "cursor"));
        while (free > 0) {
            // The next person = lowest ticket number at or after the cursor.
            Set<TypedTuple<String>> next = redis.opsForZSet()
                    .rangeByScoreWithScores(key(id, "queue"), cursor, Double.POSITIVE_INFINITY, 0, 1);
            if (next == null || next.isEmpty()) break;
            TypedTuple<String> person = next.iterator().next();
            long expires = Instant.now().plusSeconds(d.getWindowSeconds()).toEpochMilli();
            redis.opsForValue().set(passKey(id, Long.valueOf(person.getValue())), String.valueOf(expires),
                    Duration.ofSeconds(d.getWindowSeconds()));
            redis.opsForSet().add(key(id, "active"), person.getValue());
            cursor = person.getScore().longValue() + 1;
            free--;
            log.info("Drop {}: user {} let in (ticket #{})", id, person.getValue(), person.getScore().longValue());
        }
        redis.opsForValue().set(key(id, "cursor"), String.valueOf(cursor));
    }

    // ---------------------------------------------------------------- demo helper
    /** Restart a drop for demos: clear its Redis state and open it `delaySeconds` from now. */
    public DropStatusDto restart(Long showId, int delaySeconds, Long userId) {
        Drop d = drops.findByShowId(showId).orElseThrow(() -> new NotFoundException("This show has no drop."));
        resetState(d, Instant.now().plusSeconds(Math.max(10, delaySeconds)));
        return toStatus(d, userId);
    }

    /** Used on startup too (DemoDropInitializer). */
    public void resetState(Drop d, Instant opensAt) {
        Set<String> keys = redis.keys("drop:" + d.getId() + ":*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
        d.reschedule(opensAt);
        drops.save(d);
        log.info("Drop {} rescheduled to open at {}", d.getId(), opensAt);
    }
}
