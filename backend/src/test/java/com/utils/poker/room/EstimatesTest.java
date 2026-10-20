package com.utils.poker.room;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class EstimatesTest {

    @Test
    void medianOfNumericCards() {
        assertThat(Estimates.result(List.of("5", "8", "5"))).isEqualTo("5");
        assertThat(Estimates.result(List.of("3", "8"))).isEqualTo("5.5");
        assertThat(Estimates.result(List.of("½", "1", "?", "☕"))).isEqualTo("0.75");
    }

    @Test
    void mostFrequentCardWhenNoNumbers() {
        assertThat(Estimates.result(List.of("M", "L", "M"))).isEqualTo("M");
    }
}
