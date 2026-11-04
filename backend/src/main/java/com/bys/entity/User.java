package com.bys.entity;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * An @Entity is a Java class that maps to a table: one object = one row,
 * one field = one column. Hibernate (the JPA implementation) writes the SQL.
 *
 * Table is "users" (plural) because "user" is a reserved word in Postgres.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // the DB (BIGSERIAL) generates the id
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING) // store "USER", not 0. Numbers break if you reorder the enum.
    @Column(nullable = false)
    private Role role = Role.USER;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected User() {
        // JPA needs a no-args constructor to create objects from DB rows.
    }

    public User(String email, String passwordHash, String fullName) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public Role getRole() { return role; }
    public Instant getCreatedAt() { return createdAt; }
}
