// Hold only schedules reminders on the phone. Local notifications need no
// push entitlement, and the team's wildcard profile cannot sign one, so drop
// the aps-environment key the expo-notifications plugin adds.
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withLocalNotifications(config) {
  return withEntitlementsPlist(config, (next) => {
    delete next.modResults["aps-environment"];
    return next;
  });
};
