// Namespace UUID for deterministic UUID v5 POI identifiers.
// All POI IDs are generated as uuidv5(poi.name, DISPATCH_GEOFENCE_NS).
// The background check-in task registers geofences with identifier
// `${poi.id}::${poi.name}` and splits on '::' to get the name (for
// the notification) and id (for the check_in insert) without a network call.
//
// This namespace must never change — altering it would invalidate all
// existing POI UUIDs and break geofence re-registration.
export const DISPATCH_GEOFENCE_NS = "9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d";
