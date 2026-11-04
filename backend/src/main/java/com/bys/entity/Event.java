package com.bys.entity;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/** A movie / concert / play. Has many {@link Show}s. */
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String language;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(name = "poster_url")
    private String posterUrl;

    /*
     * One event -> many shows. "mappedBy = event" means the Show table owns the
     * foreign key (shows.event_id); this list is just the reverse view.
     * Collections are LAZY by default: shows are only queried if we touch this list.
     */
    @OneToMany(mappedBy = "event")
    @OrderBy("startTime ASC")
    private List<Show> shows = new ArrayList<>();

    protected Event() {}

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCategory() { return category; }
    public String getLanguage() { return language; }
    public int getDurationMinutes() { return durationMinutes; }
    public String getPosterUrl() { return posterUrl; }
    public List<Show> getShows() { return shows; }
}
