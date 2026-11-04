package com.bys.exception;

/** The client sent something that makes no sense -> HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) { super(message); }
}
