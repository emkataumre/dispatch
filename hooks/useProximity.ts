import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { getDistanceMeters } from "@/lib/geo";

export { getDistanceMeters };

export function useProximity(
  target: { lat: number; lng: number } | null,
  radiusMeters = 100,
): { isNearby: boolean } {
  const [isNearby, setIsNearby] = useState(false);

  useEffect(() => {
    if (!target) {
      setIsNearby(false);
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
      },
      (location) => {
        const distance = getDistanceMeters(
          location.coords.latitude,
          location.coords.longitude,
          target.lat,
          target.lng,
        );
        setIsNearby(distance <= radiusMeters);
      },
    )
      .then((sub) => {
        if (cancelled) {
          sub.remove();
          return;
        }
        subscription = sub;
      })
      .catch(() => {
        // Location unavailable (permission denied, GPS off, emulator) — stay false
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [target?.lat, target?.lng, radiusMeters]);

  return { isNearby };
}
