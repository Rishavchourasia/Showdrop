package com.bys.config;

import com.bys.dto.EventDtos.EventSummaryDto;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;
import java.util.List;

/**
 * PHASE 4 -- Caching with Redis.
 *
 * WHY cache the events list? It's the first thing every visitor loads and it
 * rarely changes. Instead of querying Postgres for every page view, the first
 * call stores the result in Redis (in-memory, sub-millisecond reads) and the
 * next calls for the next 10 minutes are served from there.
 *
 * WHY Redis and not a HashMap in the JVM? With 3 backend replicas (Kubernetes),
 * each would have its own HashMap. Redis is ONE shared cache for all of them,
 * and it survives backend restarts.
 *
 * The trade-off of any cache: data can be up to 10 minutes stale (the TTL).
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String EVENTS_CACHE = "events";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        // Store the cached value as readable JSON (try `redis-cli GET "events::all"`),
        // and tell Jackson the exact type so it can turn the JSON back into
        // List<EventSummaryDto> -- not a list of generic maps.
        JavaType eventsType = mapper.getTypeFactory().constructCollectionType(List.class, EventSummaryDto.class);
        var eventsSerializer = new Jackson2JsonRedisSerializer<>(mapper, eventsType);

        RedisCacheConfiguration eventsConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeValuesWith(SerializationPair.fromSerializer(eventsSerializer));

        return RedisCacheManager.builder(connectionFactory)
                .withCacheConfiguration(EVENTS_CACHE, eventsConfig)
                .build();
    }
}
