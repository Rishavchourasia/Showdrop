package com.bys.exception;

/** The request is valid, but clashes with the current state (seat taken, email used) -> HTTP 409. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
