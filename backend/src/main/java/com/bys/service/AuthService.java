package com.bys.service;

import com.bys.dto.AuthDtos.AuthResponse;
import com.bys.dto.AuthDtos.LoginRequest;
import com.bys.dto.AuthDtos.SignupRequest;
import com.bys.dto.AuthDtos.UserDto;
import com.bys.entity.User;
import com.bys.exception.ConflictException;
import com.bys.exception.NotFoundException;
import com.bys.repository.UserRepository;
import com.bys.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Signup / login business logic.
 * The SERVICE layer holds the rules ("emails are unique", "check the password");
 * it knows nothing about HTTP. That makes it reusable and easy to unit test.
 */
@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists.");
        }
        User user = users.save(new User(email, passwordEncoder.encode(req.password()), req.fullName().trim()));
        return new AuthResponse(jwtService.generateToken(user), DtoMapper.toDto(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        // Same message for "no such user" and "wrong password", so attackers
        // can't use the login form to discover which emails are registered.
        User user = users.findByEmail(normalize(req.email()))
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));
        return new AuthResponse(jwtService.generateToken(user), DtoMapper.toDto(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return users.findById(userId).map(DtoMapper::toDto)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
