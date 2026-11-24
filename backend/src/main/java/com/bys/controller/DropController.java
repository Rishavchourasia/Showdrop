package com.bys.controller;

import com.bys.dto.DropDtos.DropStatusDto;
import com.bys.dto.DropDtos.DropSummaryDto;
import com.bys.exception.NotFoundException;
import com.bys.security.AuthUser;
import com.bys.service.DropService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * The Drop Room API. Reads are public (anyone can watch the countdown);
 * joining the line and restarting the demo need a login.
 *
 *   GET  /api/drops                      which shows sell through a drop (for "Drop" badges)
 *   GET  /api/drops/show/{showId}        the Drop Room status (+ your place, if logged in)
 *   POST /api/drops/show/{showId}/join   get in line
 *   POST /api/drops/show/{showId}/restart?delaySeconds=60   demo: start the drop over
 */
@RestController
@RequestMapping("/api/drops")
public class DropController {

    private final DropService dropService;

    public DropController(DropService dropService) {
        this.dropService = dropService;
    }

    @GetMapping
    public List<DropSummaryDto> list() {
        return dropService.summaries();
    }

    /** @AuthenticationPrincipal is null for anonymous visitors: they see the room but not "you". */
    @GetMapping("/show/{showId}")
    public DropStatusDto status(@PathVariable Long showId, @AuthenticationPrincipal AuthUser user) {
        return dropService.status(showId, user == null ? null : user.id())
                .orElseThrow(() -> new NotFoundException("This show has no drop."));
    }

    @PostMapping("/show/{showId}/join")
    public DropStatusDto join(@PathVariable Long showId, @AuthenticationPrincipal AuthUser user) {
        return dropService.join(showId, user.id());
    }

    @PostMapping("/show/{showId}/restart")
    public DropStatusDto restart(@PathVariable Long showId,
                                 @RequestParam(defaultValue = "60") int delaySeconds,
                                 @AuthenticationPrincipal AuthUser user) {
        return dropService.restart(showId, delaySeconds, user.id());
    }
}
