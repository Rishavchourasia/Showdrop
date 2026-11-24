package com.bys.config;

import com.bys.repository.DropRepository;
import com.bys.service.DropService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Demo convenience: the seeded drop's time would be in the past after a
 * restart, so on startup every drop is re-scheduled to open a little later.
 * Turn it off with app.drops.demo-reset-on-start=false.
 */
@Component
public class DemoDropInitializer implements ApplicationRunner {

    private final DropRepository drops;
    private final DropService dropService;
    private final boolean enabled;
    private final int delaySeconds;

    public DemoDropInitializer(DropRepository drops, DropService dropService,
                               @Value("${app.drops.demo-reset-on-start}") boolean enabled,
                               @Value("${app.drops.demo-delay-seconds}") int delaySeconds) {
        this.drops = drops;
        this.dropService = dropService;
        this.enabled = enabled;
        this.delaySeconds = delaySeconds;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        drops.findAll().forEach(d -> dropService.resetState(d, Instant.now().plusSeconds(delaySeconds)));
    }
}
