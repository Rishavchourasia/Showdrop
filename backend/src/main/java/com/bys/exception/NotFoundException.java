package com.bys.exception;

/** Thrown by services when something doesn't exist -> GlobalExceptionHandler turns it into HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
