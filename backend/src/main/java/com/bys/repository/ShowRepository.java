package com.bys.repository;

import com.bys.entity.Show;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShowRepository extends JpaRepository<Show, Long> {

    List<Show> findByEventIdOrderByStartTimeAsc(Long eventId);

    /*
     * @EntityGraph = "also load these relations in the SAME query (a JOIN)".
     * WHY: without it, reading show.getEvent() and show.getSeats() later would
     * fire extra queries (the classic "N+1 queries" performance problem).
     */
    @EntityGraph(attributePaths = {"event", "seats"})
    Optional<Show> findWithEventAndSeatsById(Long id);
}
