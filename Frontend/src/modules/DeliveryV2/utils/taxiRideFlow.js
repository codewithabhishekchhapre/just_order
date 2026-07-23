/**
 * Shared taxi ↔ DeliveryV2 trip helpers.
 * Keep map / proximity / action UI on food-compatible trip statuses.
 */

export function toTaxiLatLng(point) {
  if (!point) return null;
  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    address: String(point.address || point.formattedAddress || "").trim(),
  };
}

export function mapTaxiRideStatusToTripStatus(status) {
  const s = String(status || "").toLowerCase();
  if (["completed", "cancelled"].includes(s)) return "COMPLETED";
  if (s === "in_progress") return "PICKED_UP";
  if (s === "arrived") return "REACHED_PICKUP";
  if (["arriving", "assigned", "accepted", "searching", "requested"].includes(s)) {
    return "PICKING_UP";
  }
  return "PICKING_UP";
}

export function buildTaxiActiveOrder(ride, fallbackRideId = null) {
  if (!ride) return null;
  const rideId = ride.id || ride._id || fallbackRideId;
  const pickupLoc = toTaxiLatLng(ride.pickup);
  const dropLoc = toTaxiLatLng(ride.drop);
  const fareTotal = Number(
    ride.fareEstimateTotal ?? ride.fare?.total ?? ride.total ?? 0,
  );

  return {
    ...ride,
    module: "taxi",
    jobType: "ride",
    rideId,
    _id: rideId,
    id: rideId,
    orderId: ride.rideNumber || rideId,
    pickup: ride.pickup || null,
    drop: ride.drop || null,
    restaurantLocation: pickupLoc,
    customerLocation: dropLoc,
    total: Number.isFinite(fareTotal) ? fareTotal : 0,
    fareEstimateTotal: Number.isFinite(fareTotal) ? fareTotal : 0,
    earnings: Number.isFinite(fareTotal) ? fareTotal : 0,
    distanceKm: Number(ride.distanceKm || 0),
    durationMin: Number(ride.durationMin || 0),
    tripDistanceKm: Number(ride.distanceKm || 0),
    estimatedTime: Number(ride.durationMin || 0),
  };
}

export function getTaxiRideId(order) {
  return order?.rideId || order?.id || order?._id || order?.orderMongoId || null;
}

export function isTaxiActiveOrder(order) {
  if (!order) return false;
  const moduleKey = String(order.module || order.jobType || "").toLowerCase();
  return moduleKey === "taxi" || moduleKey === "ride" || Boolean(order.rideId);
}
