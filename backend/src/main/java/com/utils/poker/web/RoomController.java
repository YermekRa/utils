package com.utils.poker.web;

import com.utils.poker.room.Deck;
import com.utils.poker.room.Role;
import com.utils.poker.room.RoomEvents;
import com.utils.poker.room.RoomService;
import com.utils.poker.room.RoomViews;
import com.utils.poker.room.RoomViews.DeckView;
import com.utils.poker.room.RoomViews.RoomView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
public class RoomController {

    private static final String TOKEN = "X-Participant-Token";

    private final RoomService rooms;
    private final RoomEvents events;

    public RoomController(RoomService rooms, RoomEvents events) {
        this.rooms = rooms;
        this.events = events;
    }

    public record CreateRoomRequest(@NotNull Deck deck) {
    }

    public record JoinRequest(@NotBlank @Size(max = 60) String name, @NotNull Role role) {
    }

    public record JoinResponse(UUID participantId, UUID token, RoomView room) {
    }

    public record UpdateParticipantRequest(@Size(min = 1, max = 60) String name, Role role) {
    }

    public record VoteRequest(@Size(max = 8) String card) {
    }

    public record ResetRequest(boolean save) {
    }

    public record UpdateRoomRequest(@Size(max = 500) String story, Deck deck) {
    }

    @GetMapping("/decks")
    public List<DeckView> decks() {
        return Arrays.stream(Deck.values()).map(RoomViews::of).toList();
    }

    @PostMapping("/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomView create(@Valid @RequestBody CreateRoomRequest request) {
        String id = rooms.create(request.deck()).getId();
        return rooms.view(id, null, Set.of());
    }

    @GetMapping("/rooms/{roomId}")
    public RoomView get(@PathVariable String roomId, @RequestHeader(name = TOKEN, required = false) UUID token) {
        return rooms.view(roomId, token, events.online(roomId));
    }

    @PatchMapping("/rooms/{roomId}")
    public void updateRoom(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token,
            @Valid @RequestBody UpdateRoomRequest request) {
        rooms.updateRoom(roomId, token, request.story(), request.deck());
    }

    @PostMapping("/rooms/{roomId}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public JoinResponse join(@PathVariable String roomId, @Valid @RequestBody JoinRequest request) {
        var joined = rooms.join(roomId, request.name(), request.role());
        var participant = joined.participant();
        return new JoinResponse(participant.getId(), participant.getToken(),
                rooms.view(roomId, participant.getToken(), events.online(roomId)));
    }

    @PatchMapping("/rooms/{roomId}/participants/me")
    public void updateMe(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token,
            @Valid @RequestBody UpdateParticipantRequest request) {
        rooms.updateParticipant(roomId, token, request.name(), request.role());
    }

    @DeleteMapping("/rooms/{roomId}/participants/{participantId}")
    public void remove(@PathVariable String roomId, @PathVariable UUID participantId,
            @RequestHeader(TOKEN) UUID token) {
        rooms.remove(roomId, token, participantId);
    }

    @PutMapping("/rooms/{roomId}/vote")
    public void vote(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token,
            @Valid @RequestBody VoteRequest request) {
        rooms.vote(roomId, token, request.card());
    }

    @PostMapping("/rooms/{roomId}/reveal")
    public void reveal(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token) {
        rooms.reveal(roomId, token);
    }

    @PostMapping("/rooms/{roomId}/reset")
    public void reset(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token,
            @RequestBody ResetRequest request) {
        rooms.reset(roomId, token, request.save());
    }

    @DeleteMapping("/rooms/{roomId}/history")
    public void clearHistory(@PathVariable String roomId, @RequestHeader(TOKEN) UUID token) {
        rooms.clearHistory(roomId, token);
    }

    /** EventSource не умеет передавать заголовки, поэтому токен приходит в query-параметре. */
    @GetMapping(path = "/rooms/{roomId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter events(@PathVariable String roomId, @RequestParam UUID token) {
        return events.subscribe(roomId, rooms.participantId(roomId, token));
    }
}
