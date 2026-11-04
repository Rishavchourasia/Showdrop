package com.bys.service;

import com.bys.dto.EventDtos.SeatDto;
import com.bys.dto.EventDtos.ShowDetailDto;
import com.bys.entity.Seat;
import com.bys.entity.SeatStatus;
import com.bys.entity.Show;
import com.bys.exception.NotFoundException;
import com.bys.repository.ShowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class ShowService {

    private static final Logger log = LoggerFactory.getLogger(ShowService.class);

    private final ShowRepository shows;
    private final SeatHoldService seatHolds;
    private final int holdMinutes;

    public ShowService(ShowRepository shows, SeatHoldService seatHolds,
                       @Value("${app.booking.hold-minutes}") int holdMinutes) {
        this.shows = shows;
        this.seatHolds = seatHolds;
        this.holdMinutes = holdMinutes;
    }

    /**
     * The seat map combines two sources of truth:
     *   Postgres -> BOOKED (permanent)
     *   Redis    -> HELD   (someone is in checkout right now, expires in <= 5 min)
     */
    @Transactional(readOnly = true)
    public ShowDetailDto getShow(Long id) {
        Show show = shows.findWithEventAndSeatsById(id)
                .orElseThrow(() -> new NotFoundException("Show " + id + " not found"));

        List<Seat> seats = show.getSeats();
        Set<Long> held = heldSeatsOrEmpty(show.getId(), seats.stream().map(Seat::getId).toList());

        List<SeatDto> seatDtos = seats.stream().map(s -> new SeatDto(
                s.getId(), s.getRowLabel(), s.getSeatNumber(), s.getCategory().name(), s.getPrice(),
                s.getStatus() == SeatStatus.BOOKED ? "BOOKED" : held.contains(s.getId()) ? "HELD" : "AVAILABLE"
        )).toList();

        return new ShowDetailDto(show.getId(), DtoMapper.toSummary(show.getEvent()), show.getVenueName(),
                show.getCity(), show.getStartTime(), holdMinutes, seatDtos);
    }

    /** If Redis is down we can still SHOW the seat map (holds just aren't visible). Graceful degradation. */
    private Set<Long> heldSeatsOrEmpty(Long showId, List<Long> seatIds) {
        try {
            return seatHolds.heldSeatIds(showId, seatIds);
        } catch (RuntimeException e) {
            log.warn("Redis unavailable, showing seat map without holds: {}", e.getMessage());
            return Set.of();
        }
    }
}
