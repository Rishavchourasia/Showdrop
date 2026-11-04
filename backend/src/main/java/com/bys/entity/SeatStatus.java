package com.bys.entity;

/**
 * The PERMANENT state of a seat, stored in Postgres.
 * Note there is no "HELD" here: temporary holds live in Redis (Phase 4)
 * because they must disappear by themselves after 5 minutes.
 */
public enum SeatStatus { AVAILABLE, BOOKED }
