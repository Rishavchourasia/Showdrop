package com.bys.repository;

import com.bys.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {
    /** Only returns seats that really belong to this show -- protects against "book seat 999 of another show". */
    List<Seat> findByShowIdAndIdIn(Long showId, Collection<Long> ids);
}
