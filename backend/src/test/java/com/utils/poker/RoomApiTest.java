package com.utils.poker;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoomApiTest {

    private static final String TOKEN = "X-Participant-Token";

    @Autowired
    MockMvc mvc;

    String roomId;

    @BeforeEach
    void createRoom() throws Exception {
        String body = mvc.perform(post("/api/rooms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"deck\":\"FIBONACCI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        roomId = JsonPath.read(body, "$.id");
    }

    private String join(String name, String role) throws Exception {
        String body = mvc.perform(post("/api/rooms/{id}/participants", roomId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"role\":\"" + role + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private void vote(String token, String card) throws Exception {
        mvc.perform(put("/api/rooms/{id}/vote", roomId).header(TOKEN, token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"card\":\"" + card + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void votesAreHiddenUntilReveal() throws Exception {
        String anna = join("Анна", "VOTER");
        String boris = join("Борис", "VOTER");
        String viewer = join("Зритель", "SPECTATOR");
        vote(anna, "5");
        vote(boris, "8");

        // Анна видит только свой голос
        mvc.perform(get("/api/rooms/{id}", roomId).header(TOKEN, anna))
                .andExpect(jsonPath("$.participants[0].vote").value("5"))
                .andExpect(jsonPath("$.participants[1].voted").value(true))
                .andExpect(jsonPath("$.participants[1].vote").doesNotExist());
        // Зритель не видит ни одного голоса до вскрытия
        mvc.perform(get("/api/rooms/{id}", roomId).header(TOKEN, viewer))
                .andExpect(jsonPath("$.participants[*].vote", Matchers.everyItem(Matchers.nullValue())));

        mvc.perform(post("/api/rooms/{id}/reveal", roomId).header(TOKEN, viewer)).andExpect(status().isOk());
        mvc.perform(get("/api/rooms/{id}", roomId).header(TOKEN, viewer))
                .andExpect(jsonPath("$.revealed").value(true))
                .andExpect(jsonPath("$.participants[1].vote").value("8"));

        mvc.perform(post("/api/rooms/{id}/reset", roomId).header(TOKEN, viewer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"save\":true}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/rooms/{id}", roomId))
                .andExpect(jsonPath("$.revealed").value(false))
                .andExpect(jsonPath("$.history[0].result").value("6.5"))
                .andExpect(jsonPath("$.history[0].votesCount").value(2))
                .andExpect(jsonPath("$.participants[0].voted").value(false));
    }

    @Test
    void spectatorsCannotVote() throws Exception {
        String viewer = join("Зритель", "SPECTATOR");
        mvc.perform(put("/api/rooms/{id}/vote", roomId).header(TOKEN, viewer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"card\":\"5\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void switchingToSpectatorClearsVote() throws Exception {
        String anna = join("Анна", "VOTER");
        vote(anna, "13");
        mvc.perform(patch("/api/rooms/{id}/participants/me", roomId).header(TOKEN, anna)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"SPECTATOR\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/rooms/{id}", roomId).header(TOKEN, anna))
                .andExpect(jsonPath("$.participants[0].role").value("SPECTATOR"))
                .andExpect(jsonPath("$.participants[0].voted").value(false));
    }

    @Test
    void rejectsCardsOutsideDeckAndVotesAfterReveal() throws Exception {
        String anna = join("Анна", "VOTER");
        mvc.perform(put("/api/rooms/{id}/vote", roomId).header(TOKEN, anna)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"card\":\"XL\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/rooms/{id}/reveal", roomId).header(TOKEN, anna));
        mvc.perform(put("/api/rooms/{id}/vote", roomId).header(TOKEN, anna)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"card\":\"5\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void requiresValidToken() throws Exception {
        mvc.perform(post("/api/rooms/{id}/reveal", roomId)
                        .header(TOKEN, "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/rooms/{id}", "missing")).andExpect(status().isNotFound());
    }

    @Test
    void removedParticipantLosesAccess() throws Exception {
        String anna = join("Анна", "VOTER");
        String boris = join("Борис", "VOTER");
        String borisId = JsonPath.read(
                mvc.perform(get("/api/rooms/{id}", roomId)).andReturn().getResponse().getContentAsString(),
                "$.participants[1].id");
        mvc.perform(delete("/api/rooms/{id}/participants/{pid}", roomId, borisId).header(TOKEN, anna))
                .andExpect(status().isOk());
        mvc.perform(post("/api/rooms/{id}/reveal", roomId).header(TOKEN, boris))
                .andExpect(status().isUnauthorized());
    }
}
