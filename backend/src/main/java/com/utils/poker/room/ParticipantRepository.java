package com.utils.poker.room;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {

    Optional<Participant> findByTokenAndRoomId(UUID token, String roomId);
}
