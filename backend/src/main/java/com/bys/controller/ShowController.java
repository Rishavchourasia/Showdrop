package com.bys.controller;

import com.bys.dto.EventDtos.ShowDetailDto;
import com.bys.service.ShowService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shows")
public class ShowController {

    private final ShowService showService;

    public ShowController(ShowService showService) {
        this.showService = showService;
    }

    /** GET /api/shows/{id} -> show info + full seat map with AVAILABLE / HELD / BOOKED. Public. */
    @GetMapping("/{id}")
    public ShowDetailDto get(@PathVariable Long id) {
        return showService.getShow(id);
    }
}
