package com.utils.poker.room;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface RoomRepository extends JpaRepository<Room, String> {

    @Modifying
    @Query("delete from Room r where r.updatedAt < :before")
    int deleteInactiveSince(Instant before);
}
