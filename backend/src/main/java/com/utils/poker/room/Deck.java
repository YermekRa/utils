package com.utils.poker.room;

import java.util.List;

public enum Deck {
    FIBONACCI("Фибоначчи", List.of("0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕")),
    MODIFIED("Модиф. Фибоначчи", List.of("0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100", "?", "☕")),
    TSHIRT("Размеры футболок", List.of("XS", "S", "M", "L", "XL", "XXL", "?", "☕")),
    POWERS("Степени двойки", List.of("0", "1", "2", "4", "8", "16", "32", "64", "?", "☕"));

    private final String title;
    private final List<String> cards;

    Deck(String title, List<String> cards) {
        this.title = title;
        this.cards = cards;
    }

    public String title() {
        return title;
    }

    public List<String> cards() {
        return cards;
    }
}
