package com.bys.service;

import com.bys.config.CacheConfig;
import com.bys.dto.EventDtos.EventDetailDto;
import com.bys.dto.EventDtos.EventSummaryDto;
import com.bys.entity.Event;
import com.bys.exception.NotFoundException;
import com.bys.repository.EventRepository;
import com.bys.repository.ShowRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);

    private final EventRepository events;
    private final ShowRepository shows;

    public EventService(EventRepository events, ShowRepository shows) {
        this.events = events;
        this.shows = shows;
    }

    /**
     * PHASE 4: @Cacheable means "before running this method, look in the
     * 'events' cache under key 'all'. If found, return that and SKIP the method.
     * If not, run it and store the result." Watch the log: the line below only
     * appears on a cache miss.
     */
    @Cacheable(cacheNames = CacheConfig.EVENTS_CACHE, key = "'all'")
    @Transactional(readOnly = true)
    public List<EventSummaryDto> listEvents() {
        log.info("Cache miss: loading events list from Postgres");
        return events.findAll(Sort.by("title")).stream().map(DtoMapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public EventDetailDto getEvent(Long id) {
        Event e = events.findById(id).orElseThrow(() -> new NotFoundException("Event " + id + " not found"));
        var showDtos = shows.findByEventIdOrderByStartTimeAsc(id).stream().map(DtoMapper::toSummary).toList();
        return new EventDetailDto(e.getId(), e.getTitle(), e.getDescription(), e.getCategory(), e.getLanguage(),
                e.getDurationMinutes(), e.getPosterUrl(), showDtos);
    }
}
