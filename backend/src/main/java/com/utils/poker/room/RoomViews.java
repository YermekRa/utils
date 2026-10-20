package com.utils.poker.room;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** То, что видит конкретный участник или зритель: чужие голоса скрыты до вскрытия карт. */
public final class RoomViews {

    private RoomViews() {
    }

    public record RoomView(
            String id,
            String deck,
            List<String> cards,
            String story,
            boolean revealed,
            List<ParticipantView> participants,
            List<EstimateView> history) {
    }

    public record ParticipantView(UUID id, String name, Role role, boolean voted, String vote, boolean online) {
    }

    public record EstimateView(String story, String result, int votesCount, Instant createdAt) {
    }

    public record DeckView(String id, String title, List<String> cards) {
    }

    public static RoomView of(Room room, UUID viewerId, Set<UUID> online) {
        List<ParticipantView> participants = room.getParticipants().stream()
                .map(p -> new ParticipantView(
                        p.getId(),
                        p.getName(),
                        p.getRole(),
                        p.getVote() != null,
                        room.isRevealed() || p.getId().equals(viewerId) ? p.getVote() : null,
                        online.contains(p.getId())))
                .toList();
        List<EstimateView> history = room.getEstimates().stream()
                .map(e -> new EstimateView(e.getStory(), e.getResult(), e.getVotesCount(), e.getCreatedAt()))
                .toList();
        return new RoomView(room.getId(), room.getDeck().name(), room.getDeck().cards(), room.getStory(),
                room.isRevealed(), participants, history);
    }

    public static DeckView of(Deck deck) {
        return new DeckView(deck.name(), deck.title(), deck.cards());
    }
}
