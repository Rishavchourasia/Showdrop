package com.bys.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

/** A single seat for a single show, e.g. "A5 at the 6pm Starfall show". */
@Entity
@Table(name = "seats")
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id")
    private Show show;

    @Column(name = "row_label", nullable = false)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false)
    private int seatNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatCategory category;

    // BigDecimal, never double, for money: 0.1 + 0.2 != 0.3 in floating point.
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatStatus status = SeatStatus.AVAILABLE;

    /*
     * OPTIMISTIC LOCKING. Hibernate adds "AND version = ?" to every UPDATE and
     * bumps the number. If two transactions both read version=3 and both try
     * to book this seat, the second UPDATE matches 0 rows and Hibernate throws
     * ObjectOptimisticLockingFailureException -> we return 409 Conflict.
     * This is the database's last line of defence against double booking.
     */
    @Version
    private Long version;

    protected Seat() {}

    public Long getId() { return id; }
    public Show getShow() { return show; }
    public String getRowLabel() { return rowLabel; }
    public int getSeatNumber() { return seatNumber; }
    public SeatCategory getCategory() { return category; }
    public BigDecimal getPrice() { return price; }
    public SeatStatus getStatus() { return status; }
    public Long getVersion() { return version; }

    /** "A5" -- handy for messages and logs. */
    public String getLabel() { return rowLabel + seatNumber; }

    public void markBooked() { this.status = SeatStatus.BOOKED; }
}
