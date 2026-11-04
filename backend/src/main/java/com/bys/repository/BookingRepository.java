package com.bys.repository;

import com.bys.entity.Booking;
import com.bys.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /*
     * When a method name would get too long, write the query yourself in JPQL.
     * JPQL looks like SQL but uses ENTITY and FIELD names, not table/column names.
     * "join fetch" loads the related rows in the same query (avoids N+1).
     */
    @Query("""
            select distinct b from Booking b
            join fetch b.show s
            join fetch s.event
            left join fetch b.seats
            where b.user.id = :userId
            order by b.createdAt desc
            """)
    List<Booking> findAllForUser(@Param("userId") Long userId);

    /** Ownership check built into the query: you can only fetch YOUR booking. */
    @Query("""
            select b from Booking b
            join fetch b.show s
            join fetch s.event
            join fetch b.user
            left join fetch b.seats
            where b.id = :id and b.user.id = :userId
            """)
    Optional<Booking> findForUser(@Param("id") Long id, @Param("userId") Long userId);

    @Query("select b from Booking b left join fetch b.seats where b.status = :status and b.expiresAt < :now")
    List<Booking> findExpired(@Param("status") BookingStatus status, @Param("now") Instant now);
}
