import json
import logging

from app.config import settings
from app.database import redis_client


logger = logging.getLogger(__name__)

GEOFENCE_CONFIG_KEY = "attendance:geofence-config"


def _default_config() -> dict[str, float | int | str]:
    return {
        "campus_lat": float(settings.CAMPUS_LAT),
        "campus_lng": float(settings.CAMPUS_LNG),
        "max_radius_meters": int(settings.MAX_RADIUS_METERS),
        "source": "environment",
    }


def _coerce_config(payload: dict) -> dict[str, float | int | str]:
    return {
        "campus_lat": float(payload.get("campus_lat", settings.CAMPUS_LAT)),
        "campus_lng": float(payload.get("campus_lng", settings.CAMPUS_LNG)),
        "max_radius_meters": int(payload.get("max_radius_meters", settings.MAX_RADIUS_METERS)),
        "source": "redis",
    }


def get_geofence_config() -> dict[str, float | int | str]:
    try:
        raw_config = redis_client.get(GEOFENCE_CONFIG_KEY)
    except Exception as exc:
        logger.warning("Using default geofence config because Redis read failed: %s", exc)
        return _default_config()

    if not raw_config:
        return _default_config()

    try:
        payload = json.loads(raw_config)
        if not isinstance(payload, dict):
            return _default_config()
        return _coerce_config(payload)
    except Exception as exc:
        logger.warning("Invalid geofence config in Redis, using defaults: %s", exc)
        return _default_config()


def set_geofence_config(
    campus_lat: float,
    campus_lng: float,
    max_radius_meters: int,
) -> dict[str, float | int | str]:
    config = {
        "campus_lat": float(campus_lat),
        "campus_lng": float(campus_lng),
        "max_radius_meters": int(max_radius_meters),
    }

    try:
        redis_client.set(GEOFENCE_CONFIG_KEY, json.dumps(config))
    except Exception as exc:
        logger.error("Failed to persist geofence config in Redis: %s", exc)
        raise RuntimeError("Unable to persist geofence settings.") from exc

    return {**config, "source": "redis"}


def clear_geofence_config() -> dict[str, float | int | str]:
    try:
        redis_client.delete(GEOFENCE_CONFIG_KEY)
    except Exception as exc:
        logger.error("Failed to clear geofence config in Redis: %s", exc)
        raise RuntimeError("Unable to reset geofence settings.") from exc

    return _default_config()