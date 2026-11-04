package com.bys.controller;

import com.bys.dto.EventDtos.EventDetailDto;
import com.bys.dto.EventDtos.EventSummaryDto;
import com.bys.service.EventService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    /** GET /api/events -> all events (cached in Redis). Public. */
    @GetMapping
    public List<EventSummaryDto> list() {
        return eventService.listEvents();
    }

    /** GET /api/events/{id} -> one event + its shows. {id} in the path becomes the `id` parameter. */
    @GetMapping("/{id}")
    public EventDetailDto get(@PathVariable Long id) {
        return eventService.getEvent(id);
    }
}
