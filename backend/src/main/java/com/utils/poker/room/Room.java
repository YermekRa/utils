package com.utils.poker.room;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
public class Room {

    @Id
    private String id;

    @Enumerated(EnumType.STRING)
    private Deck deck;

    private String story = "";

    private boolean revealed;

    private Instant createdAt;

    private Instant updatedAt;

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("joinedAt")
    private List<Participant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    private List<Estimate> estimates = new ArrayList<>();

    protected Room() {
    }

    public Room(String id, Deck deck) {
        this.id = id;
        this.deck = deck;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public void touch() {
        updatedAt = Instant.now();
    }

    public void clearVotes() {
        revealed = false;
        participants.forEach(p -> p.setVote(null));
    }

    public String getId() {
        return id;
    }

    public Deck getDeck() {
        return deck;
    }

    public void setDeck(Deck deck) {
        this.deck = deck;
    }

    public String getStory() {
        return story;
    }

    public void setStory(String story) {
        this.story = story;
    }

    public boolean isRevealed() {
        return revealed;
    }

    public void setRevealed(boolean revealed) {
        this.revealed = revealed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<Participant> getParticipants() {
        return participants;
    }

    public List<Estimate> getEstimates() {
        return estimates;
    }
}
