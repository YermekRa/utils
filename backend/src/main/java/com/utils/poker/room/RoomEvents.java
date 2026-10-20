package com.utils.poker.room;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * SSE-подписки на комнаты. Каждый подписчик получает актуальное состояние комнаты после любого изменения.
 * Подписки хранятся в памяти, поэтому бэкенд рассчитан на один экземпляр.
 */
@Component
public class RoomEvents {

    private static final Logger log = LoggerFactory.getLogger(RoomEvents.class);

    private record Subscriber(String roomId, UUID participantId, SseEmitter emitter) {
    }

    private final Map<String, List<Subscriber>> subscribers = new ConcurrentHashMap<>();
    private final RoomService rooms;
    private final ApplicationEventPublisher events;

    public RoomEvents(RoomService rooms, ApplicationEventPublisher events) {
        this.rooms = rooms;
        this.events = events;
    }

    public SseEmitter subscribe(String roomId, UUID participantId) {
        SseEmitter emitter = new SseEmitter(0L);
        Subscriber subscriber = new Subscriber(roomId, participantId, emitter);
        subscribers.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>()).add(subscriber);
        emitter.onCompletion(() -> unsubscribe(subscriber));
        emitter.onTimeout(() -> unsubscribe(subscriber));
        emitter.onError(e -> unsubscribe(subscriber));
        events.publishEvent(new RoomChangedEvent(roomId));
        return emitter;
    }

    public Set<UUID> online(String roomId) {
        return subscribers.getOrDefault(roomId, List.of()).stream()
                .map(Subscriber::participantId)
                .collect(Collectors.toSet());
    }

    @TransactionalEventListener(fallbackExecution = true)
    void onRoomChanged(RoomChangedEvent event) {
        List<Subscriber> list = subscribers.get(event.roomId());
        if (list == null || list.isEmpty()) {
            return;
        }
        Set<UUID> online = online(event.roomId());
        Map<UUID, RoomViews.RoomView> views = rooms.viewsFor(
                event.roomId(), list.stream().map(Subscriber::participantId).toList(), online);
        for (Subscriber s : list) {
            RoomViews.RoomView view = views.get(s.participantId());
            if (view == null) {
                // Комната удалена
                s.emitter().complete();
                continue;
            }
            send(s, SseEmitter.event().name("room").data(view, MediaType.APPLICATION_JSON));
        }
    }

    /** Периодический пинг, чтобы прокси не рвали соединение и отвалившиеся клиенты быстрее отписывались. */
    @Scheduled(fixedRate = 25_000)
    void ping() {
        subscribers.values().forEach(list -> list.forEach(s -> send(s, SseEmitter.event().comment("ping"))));
    }

    private void send(Subscriber s, SseEmitter.SseEventBuilder event) {
        try {
            s.emitter().send(event);
        } catch (IOException | IllegalStateException e) {
            log.debug("SSE send failed: {}", e.getMessage());
            unsubscribe(s);
        }
    }

    private void unsubscribe(Subscriber s) {
        List<Subscriber> list = subscribers.get(s.roomId());
        if (list != null && list.remove(s)) {
            subscribers.computeIfPresent(s.roomId(), (k, v) -> v.isEmpty() ? null : v);
            events.publishEvent(new RoomChangedEvent(s.roomId()));
        }
    }
}
