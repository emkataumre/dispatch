// Custom entry point — task definitions must be registered before the app
// component tree mounts. In headless JS mode (background geofence events),
// expo-router never renders components, so side-effect imports inside layout
// files are never executed. Importing here guarantees defineTask runs in both
// foreground and headless contexts.
import "./lib/backgroundGeofences";
import "./lib/notifications";

import "expo-router/entry";
