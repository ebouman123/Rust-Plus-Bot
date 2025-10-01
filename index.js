require("dotenv").config();
const RustPlus = require("@liamcottle/rustplus.js");

// Replace with your own details
const SERVER_IP = process.env.SERVER_IP;
const SERVER_PORT = parseInt(process.env.SERVER_PORT);
const STEAM_ID = process.env.STEAM_ID;
const PLAYER_TOKEN = parseInt(process.env.PLAYER_TOKEN);

const rustplus = new RustPlus(SERVER_IP, SERVER_PORT, STEAM_ID, PLAYER_TOKEN);

rustplus.connect();

rustplus.on("connected", () => {
  console.log("Connected to Rust+");
  rustplus.sendTeamMessage("Bot is online!");
});

// Listen for map events (locked crate, vendor, etc.)
rustplus.on("event", (event) => {
  // Debug: see full event structure
  console.log("Event received:", JSON.stringify(event, null, 2));

  // 🔒 Locked Crate
  if (event?.marker?.type === "LockedCrate") {
    const pos = event.marker.position;
    rustplus.sendTeamMessage(
      `Locked Crate spawned at X:${pos.x.toFixed(0)} Z:${pos.y.toFixed(0)}`
    );
  }

  // 🛒 Traveling Vendor
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
  
    ".hello": (rustplus) => {
      rustplus.sendTeamMessage("👋 Hello, team!");
    },
  };
  
  // Update latest crates/vendors on events
  rustplus.on("event", (event) => {
    const marker = event?.marker;
    if (!marker || !marker.position) return;
  
    // Locked Crate
    if (marker.type === "LockedCrate") {
      latestCrates.set(marker.id, marker.position);
      rustplus.sendTeamMessage(`Locked Crate spawned at X:${marker.position.x.toFixed(0)} Z:${marker.position.y.toFixed(0)}`);
    }
  
    // Traveling Vendor
    if (marker.type === "CH47Scientist") {
      latestVendors.set(marker.id, marker.position);
      rustplus.sendTeamMessage(`Traveling Vendor spotted at X:${marker.position.x.toFixed(0)} Z:${marker.position.y.toFixed(0)}`);
    }
  });
  
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
  