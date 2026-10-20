CREATE TABLE room (
    id         VARCHAR(16) PRIMARY KEY,
    deck       VARCHAR(32)  NOT NULL,
    story      VARCHAR(500) NOT NULL DEFAULT '',
    revealed   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

CREATE TABLE participant (
    id        UUID PRIMARY KEY,
    room_id   VARCHAR(16) NOT NULL REFERENCES room (id) ON DELETE CASCADE,
    token     UUID        NOT NULL UNIQUE,
    name      VARCHAR(60) NOT NULL,
    role      VARCHAR(16) NOT NULL,
    vote      VARCHAR(8),
    joined_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX participant_room_idx ON participant (room_id);

CREATE TABLE estimate (
    id          BIGSERIAL PRIMARY KEY,
    room_id     VARCHAR(16)  NOT NULL REFERENCES room (id) ON DELETE CASCADE,
    story       VARCHAR(500) NOT NULL,
    result      VARCHAR(16)  NOT NULL,
    votes_count INT          NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX estimate_room_idx ON estimate (room_id, created_at DESC);
