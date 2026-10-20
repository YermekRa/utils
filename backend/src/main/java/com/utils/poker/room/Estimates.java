package com.utils.poker.room;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Итог раунда: медиана числовых карт, а если их нет — самая частая карта. */
final class Estimates {

    private Estimates() {
    }

    static String result(Collection<String> votes) {
        List<Double> numbers = votes.stream()
                .map(Estimates::toNumber)
                .filter(n -> n != null)
                .sorted()
                .toList();
        if (!numbers.isEmpty()) {
            int mid = numbers.size() / 2;
            double median = numbers.size() % 2 == 1
                    ? numbers.get(mid)
                    : (numbers.get(mid - 1) + numbers.get(mid)) / 2;
            return format(median);
        }
        Map<String, Long> counts = votes.stream()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return counts.entrySet().stream()
                .max(Map.Entry.<String, Long>comparingByValue().thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())))
                .map(Map.Entry::getKey)
                .orElse("—");
    }

    private static Double toNumber(String card) {
        if ("½".equals(card)) {
            return 0.5;
        }
        try {
            return Double.parseDouble(card);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String format(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }
}
