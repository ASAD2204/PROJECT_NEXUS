import math
from app.geofence import get_geofence_config


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in **meters** between two points."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def is_on_campus(student_lat: float, student_lng: float) -> tuple[bool, float]:
    """Check whether coordinates fall within the configured campus radius."""
    geofence = get_geofence_config()
    distance = haversine_distance(
        float(geofence["campus_lat"]),
        float(geofence["campus_lng"]),
        student_lat,
        student_lng,
    )
    return distance <= int(geofence["max_radius_meters"]), distance
