package com.bys.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** One occurrence of an {@link Event} at a venue and time. Has many {@link Seat}s. */
@Entity
@Table(name = "shows")
public class Show {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Many shows -> one event. This side holds the foreign key column event_id.
     * LAZY: don't load the Event row unless we actually call getEvent()
     * (the default for @ManyToOne is EAGER, which quietly adds extra queries).
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id")
    private Event event;

    @Column(name = "venue_name", nullable = false)
    private String venueName;

    @Column(nullable = false)
    private String city;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @OneToMany(mappedBy = "show")
    @OrderBy("rowLabel ASC, seatNumber ASC")
    private List<Seat> seats = new ArrayList<>();

    protected Show() {}

    public Long getId() { return id; }
    public Event getEvent() { return event; }
    public String getVenueName() { return venueName; }
    public String getCity() { return city; }
    public Instant getStartTime() { return startTime; }
    public List<Seat> getSeats() { return seats; }
}
