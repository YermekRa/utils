package com.utils.poker.room;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.Instant;

/** Сохранённая оценка задачи. */
@Entity
public class Estimate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id")
    private Room room;

    private String story;

    private String result;

    private int votesCount;

    private Instant createdAt;

    protected Estimate() {
    }

    public Estimate(Room room, String story, String result, int votesCount) {
        this.room = room;
        this.story = story;
        this.result = result;
        this.votesCount = votesCount;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getStory() {
        return story;
    }

    public String getResult() {
        return result;
    }

    public int getVotesCount() {
        return votesCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
