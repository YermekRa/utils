package com.utils.poker.room;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoomService {

    private static final String ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    private static final int ID_LENGTH = 8;

    private final RoomRepository rooms;
    private final ParticipantRepository participants;
    private final ApplicationEventPublisher events;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();

    public RoomService(RoomRepository rooms, ParticipantRepository participants, ApplicationEventPublisher events,
            @Value("${app.rooms.ttl}") Duration ttl) {
        this.rooms = rooms;
        this.participants = participants;
        this.events = events;
        this.ttl = ttl;
    }

    public record Joined(Participant participant, Room room) {
    }

    @Transactional
    public Room create(Deck deck) {
        String id;
        do {
            id = randomId();
        } while (rooms.existsById(id));
        return rooms.save(new Room(id, deck));
    }

    @Transactional(readOnly = true)
    public RoomViews.RoomView view(String roomId, UUID token, Set<UUID> online) {
        Room room = room(roomId);
        UUID viewerId = token == null ? null : participants.findByTokenAndRoomId(token, roomId)
                .map(Participant::getId)
                .orElse(null);
        return RoomViews.of(room, viewerId, online);
    }

    /** Представления комнаты для нескольких зрителей разом — одна загрузка из БД на рассылку. */
    @Transactional(readOnly = true)
    public Map<UUID, RoomViews.RoomView> viewsFor(String roomId, Collection<UUID> viewerIds, Set<UUID> online) {
        return rooms.findById(roomId)
                .map(room -> viewerIds.stream().distinct()
                        .collect(Collectors.toMap(Function.identity(), id -> RoomViews.of(room, id, online))))
                .orElse(Map.of());
    }

    @Transactional(readOnly = true)
    public UUID participantId(String roomId, UUID token) {
        return participant(roomId, token).getId();
    }

    @Transactional
    public Joined join(String roomId, String name, Role role) {
        Room room = room(roomId);
        Participant participant = new Participant(room, name.strip(), role);
        room.getParticipants().add(participant);
        changed(room);
        return new Joined(participant, room);
    }

    @Transactional
    public void updateParticipant(String roomId, UUID token, String name, Role role) {
        Participant p = participant(roomId, token);
        if (name != null) {
            p.setName(name.strip());
        }
        if (role != null) {
            p.setRole(role);
            if (role == Role.SPECTATOR) {
                p.setVote(null);
            }
        }
        changed(p.getRoom());
    }

    @Transactional
    public void remove(String roomId, UUID token, UUID participantId) {
        Room room = participant(roomId, token).getRoom();
        if (!room.getParticipants().removeIf(p -> p.getId().equals(participantId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Участник не найден");
        }
        changed(room);
    }

    @Transactional
    public void vote(String roomId, UUID token, String card) {
        Participant p = participant(roomId, token);
        Room room = p.getRoom();
        if (p.getRole() == Role.SPECTATOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Зрители не голосуют");
        }
        if (room.isRevealed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Карты уже вскрыты");
        }
        if (card != null && !room.getDeck().cards().contains(card)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Такой карты нет в колоде");
        }
        p.setVote(card);
        changed(room);
    }

    @Transactional
    public void reveal(String roomId, UUID token) {
        Room room = participant(roomId, token).getRoom();
        room.setRevealed(true);
        changed(room);
    }

    /** Новый раунд; при {@code save} итог текущего раунда попадает в историю. */
    @Transactional
    public void reset(String roomId, UUID token, boolean save) {
        Room room = participant(roomId, token).getRoom();
        List<String> votes = room.getParticipants().stream()
                .map(Participant::getVote)
                .filter(Objects::nonNull)
                .toList();
        if (save && room.isRevealed() && !votes.isEmpty()) {
            String story = room.getStory().isBlank() ? "Без названия" : room.getStory();
            room.getEstimates().addFirst(new Estimate(room, story, Estimates.result(votes), votes.size()));
            room.setStory("");
        }
        room.clearVotes();
        changed(room);
    }

    @Transactional
    public void updateRoom(String roomId, UUID token, String story, Deck deck) {
        Room room = participant(roomId, token).getRoom();
        if (story != null) {
            room.setStory(story.strip());
        }
        if (deck != null && deck != room.getDeck()) {
            room.setDeck(deck);
            room.clearVotes();
        }
        changed(room);
    }

    @Transactional
    public void clearHistory(String roomId, UUID token) {
        Room room = participant(roomId, token).getRoom();
        room.getEstimates().clear();
        changed(room);
    }

    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanup() {
        rooms.deleteInactiveSince(Instant.now().minus(ttl));
    }

    private void changed(Room room) {
        room.touch();
        events.publishEvent(new RoomChangedEvent(room.getId()));
    }

    private Room room(String roomId) {
        return rooms.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Комната не найдена"));
    }

    private Participant participant(String roomId, UUID token) {
        if (token == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Сначала войдите в комнату");
        }
        return participants.findByTokenAndRoomId(token, roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Участник не найден в комнате"));
    }

    private String randomId() {
        StringBuilder sb = new StringBuilder(ID_LENGTH);
        for (int i = 0; i < ID_LENGTH; i++) {
            sb.append(ID_ALPHABET.charAt(random.nextInt(ID_ALPHABET.length())));
        }
        return sb.toString();
    }
}
