package com.bys.repository;

import com.bys.entity.Drop;
import com.bys.entity.DropStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DropRepository extends JpaRepository<Drop, Long> {

    // @EntityGraph: load the show + event in the same query, because the scheduler
    // runs outside any transaction and needs the event title for the Kafka message.
    @EntityGraph(attributePaths = {"show", "show.event"})
    Optional<Drop> findByShowId(Long showId);

    @EntityGraph(attributePaths = {"show", "show.event"})
    List<Drop> findByStatus(DropStatus status);

    @Override
    @EntityGraph(attributePaths = {"show", "show.event"})
    List<Drop> findAll();

    /** Show ids that currently have a drop, so lists can show a "Drop" badge. */
    @Query("select d.show.id from Drop d")
    List<Long> findAllShowIds();
}
