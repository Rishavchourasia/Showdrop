package com.bys.security;

import com.bys.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A plain unit test: no Spring, no database -- just `new JwtService(...)`.
 * This is one payoff of constructor injection: classes are easy to build in tests.
 */
class JwtServiceTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-test-secret";

    private final JwtService jwt = new JwtService(SECRET, 60);

    private static User user(long id, String email) {
        User u = new User(email, "hash", "Test");
        ReflectionTestUtils.setField(u, "id", id); // normally the DB assigns the id
        return u;
    }

    @Test
    void tokenRoundTrip() {
        String token = jwt.generateToken(user(42, "a@b.com"));

        assertThat(jwt.parse(token)).contains(new AuthUser(42L, "a@b.com"));
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwt.generateToken(user(42, "a@b.com"));
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");

        assertThat(jwt.parse(tampered)).isEmpty();
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String foreign = new JwtService("another-secret-another-secret-another-secret!!", 60)
                .generateToken(user(1, "x@y.com"));

        assertThat(jwt.parse(foreign)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        String expired = new JwtService(SECRET, -1).generateToken(user(1, "x@y.com"));

        assertThat(jwt.parse(expired)).isEmpty();
    }
}
