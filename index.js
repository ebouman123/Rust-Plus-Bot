require("dotenv").config();
const RustPlus = require("@liamcottle/rustplus.js");

// Replace with your own details
const SERVER_IP = process.env.SERVER_IP;
const SERVER_PORT = parseInt(process.env.SERVER_PORT);
const STEAM_ID = process.env.STEAM_ID;
const PLAYER_TOKEN = parseInt(process.env.PLAYER_TOKEN);

const rustplus = new RustPlus(SERVER_IP, SERVER_PORT, STEAM_ID, PLAYER_TOKEN);

rustplus.connect();

const markerTypes = {
  1: "Oil Rig",
  2: "Cargo Ship",
  3: "Vending Machine",
  4: "Oil Rig",
  5: "Player Marker",
  6: "Explosion",
  7: "Excavator",
  8: "CH47 Crate",
  9: "Hackable Crate",
  10: "Fishing Village",
  11: "Harbor"
};

rustplus.on("connected", () => {
  console.log("✅ Connected to Rust+");
  rustplus.sendTeamMessage("Bot is online!");

  rustplus.getMapMarkers((msg) => {
    if (msg.response && msg.response.mapMarkers) {
      const markers = msg.response.mapMarkers.markers;

      console.log("🗺️ Current map markers:");

      markers.forEach((marker, i) => {
        // Skip vending machines
        if (marker.type === 3) return;

        const typeName = markerTypes[marker.type] || `Unknown (${marker.type})`;

        console.log(`Marker #${i + 1}`);
        console.log(`  ID: ${marker.id}`);
        console.log(`  Type: ${typeName}`);
        console.log(`  Name: ${marker.name || "N/A"}`);
        console.log(`  X: ${marker.x.toFixed(2)}`);
        console.log(`  Y: ${marker.y.toFixed(2)}`);
        console.log("---");
      });
    } else {
      console.log("⚠️ No markers found or invalid response");
    }
  });
});



// Listen for map events (locked crate, vendor, etc.)
rustplus.on("event", (event) => {
  // Debug: see full event structure
  console.log("Event received:", JSON.stringify(event, null, 2));

  rustplus.sendTeamMessage('Event spawned: ', event)

  // Locked Crate
  if (event?.marker?.type === "LockedCrate") {
    const pos = event.marker.position;
    rustplus.sendTeamMessage(
      `Locked Crate spawned at X:${pos.x.toFixed(0)} Z:${pos.y.toFixed(0)}`
    );
  }

  // Traveling Vendor
  if (event?.marker?.type === "CH47Scientist") {
    const pos = event.marker.position;
    rustplus.sendTeamMessage(
      `Traveling Vendor spotted at X:${pos.x.toFixed(0)} Z:${pos.y.toFixed(
        0
      )}`
    );
  }
});

// Utilities
function formatServerTime(timeFloat) {
  let hours = Math.floor(timeFloat);
  const minutes = Math.floor((timeFloat - hours) * 60);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutesStr = minutes.toString().padStart(2, "0");
  return `${hours}:${minutesStr} ${ampm}`;
}

// Track latest known crates and vendors
const latestCrates = new Map();    // key = marker.id, value = position
const latestVendors = new Map();   // key = marker.id, value = position

// Commands
const commands = {
  ".time": (rustplus) => {
    rustplus.getTime((response) => {
      const t = response?.response?.time;
      if (!t) return rustplus.sendTeamMessage("Could not get server time.");
      rustplus.sendTeamMessage(`Current server time: ${formatServerTime(t.time)}`);
    });
  },

  ".crate": (rustplus) => {
    if (latestCrates.size === 0) {
      rustplus.sendTeamMessage("No locked crates detected.");
      return;
    }

    latestCrates.forEach((pos) => {
      rustplus.sendTeamMessage(`Locked Crate at X:${pos.x.toFixed(0)} Z:${pos.y.toFixed(0)}`);
    });
  },

  ".vendor": (rustplus) => {
    if (latestVendors.size === 0) {
      rustplus.sendTeamMessage("No traveling vendors detected.");
      return;
    }

    latestVendors.forEach((pos) => {
      rustplus.sendTeamMessage(`Traveling Vendor spotted at X:${pos.x.toFixed(0)} Z:${pos.y.toFixed(0)}`);
    });
  },

};

// Command listener
rustplus.on("message", (packet) => {
  const chatMsg = packet?.broadcast?.teamMessage?.message?.message;
  if (!chatMsg) return;

  const text = chatMsg.trim().toLowerCase();
  if (commands[text]) {
    try {
      commands[text](rustplus);
    } catch (err) {
      console.error("Error executing command:", err);
      rustplus.sendTeamMessage("Something went wrong executing the command.");
    }
  }
});

