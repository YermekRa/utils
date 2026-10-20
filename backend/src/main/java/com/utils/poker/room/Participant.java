package com.utils.poker.room;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;

@Entity
public class Participant {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id")
    private Room room;

    /** Секрет участника: выдаётся только ему при входе и нужен для действий от его имени. */
    private UUID token;

    private String name;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String vote;

    private Instant joinedAt;

    protected Participant() {
    }

    public Participant(Room room, String name, Role role) {
        this.id = UUID.randomUUID();
        this.token = UUID.randomUUID();
        this.room = room;
        this.name = name;
        this.role = role;
        this.joinedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public UUID getToken() {
        return token;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getVote() {
        return vote;
    }

    public void setVote(String vote) {
        this.vote = vote;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }
}
