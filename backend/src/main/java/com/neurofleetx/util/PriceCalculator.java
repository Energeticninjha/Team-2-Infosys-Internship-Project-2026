package com.neurofleetx.util;

import org.springframework.stereotype.Component;

@Component
public class PriceCalculator {

    private static final double BASE_RATE_PER_KM = 30.0;
    private static final double ONE_WAY_SURCHARGE_PERCENTAGE = 0.40; // 40%

    /**
     * Calculates the price based on distance and trip type.
     * Logic: Distance * 30rs/km.
     * If one-way, add 40% surcharge.
     *
     * @param distanceKm Double distance in Kilometers
     * @param isOneWay   boolean true if the trip is one-way
     * @return Calculated price (rounded to 2 decimal places)
     */
    public Double calculatePrice(Double distanceKm, boolean isOneWay) {
        if (distanceKm == null || distanceKm < 0) {
            return 0.0;
        }

        double basePrice = distanceKm * BASE_RATE_PER_KM;
        double finalPrice = basePrice;

        if (isOneWay) {
            finalPrice += (basePrice * ONE_WAY_SURCHARGE_PERCENTAGE);
        }

        // Round to 2 decimal places
        return Math.round(finalPrice * 100.0) / 100.0;
    }

    /**
     * Safety method to estimate price from duration if distance is missing
     * (Fallback logic to maintain system stability)
     */
    public Double estimateFromDuration(Double durationMinutes) {
        // rough estimation: 1 min = 0.5 km (30km/h avg speed)
        if (durationMinutes == null)
            return 150.0; // Min fare
        double estDistance = durationMinutes * 0.5;
        return calculatePrice(estDistance, true);
    }
}
