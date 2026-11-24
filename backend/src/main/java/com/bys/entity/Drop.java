package com.bys.entity;

import jakarta.persistence.*;

import java.time.Instant;

/** A scheduled, fair on-sale for one show. See V3__drops.sql for the idea. */
@Entity
@Table(name = "drops")
public class Drop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id")
    private Show show;

    @Column(name = "opens_at", nullable = false)
    private Instant opensAt;

    @Column(name = "batch_size", nullable = false)
    private int batchSize;

    @Column(name = "window_seconds", nullable = false)
    private int windowSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DropStatus status = DropStatus.SCHEDULED;

    @Column(name = "opened_at")
    private Instant openedAt;

    protected Drop() {}

    public Long getId() { return id; }
    public Show getShow() { return show; }
    public Instant getOpensAt() { return opensAt; }
    public int getBatchSize() { return batchSize; }
    public int getWindowSeconds() { return windowSeconds; }
    public DropStatus getStatus() { return status; }
    public Instant getOpenedAt() { return openedAt; }

    public void markOpen(Instant now) {
        this.status = DropStatus.OPEN;
        this.openedAt = now;
    }

    /** Demo helper: put the drop back to "not open yet", opening at `opensAt`. */
    public void reschedule(Instant opensAt) {
        this.status = DropStatus.SCHEDULED;
        this.openedAt = null;
        this.opensAt = opensAt;
    }
}
