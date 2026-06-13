// State Variables
let cache = {
  meters: []
};

// Local device states map (meterId -> { status, lastPing })
let deviceStates = {};

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");
const terminalBody = document.getElementById("terminal-body");
const terminalConsole = document.getElementById("terminal-console");
const terminalStatus = document.getElementById("terminal-status");
const wakeupAllBtn = document.getElementById("wakeup-all-btn");
const clearLogsBtn = document.getElementById("clear-logs-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
});

const setupEventListeners = () => {
  if (refreshDataBtn) {
    refreshDataBtn.addEventListener("click", async () => {
      refreshDataBtn.disabled = true;
      refreshDataBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
      window.showPageLoader();
      await loadAllData();
      refreshDataBtn.disabled = false;
      refreshDataBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span>Refresh Data</span>`;
    });
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      terminalBody.innerHTML = "";
      appendLog("Terminal log buffer cleared.", "info");
    });
  }

  if (wakeupAllBtn) {
    wakeupAllBtn.addEventListener("click", triggerWakeupAll);
  }
};

const loadAllData = async () => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return; // auth.js will handle redirect

    // Fetch meters
    const { data: metersData, error: me } = await supabaseClient
      .from("meters")
      .select("*")
      .order("created_at", { ascending: false });
    if (me) throw me;
    
    cache.meters = metersData || [];

    // Initialize local device mock status
    cache.meters.forEach((meter, index) => {
      if (!deviceStates[meter.id]) {
        // Distribute mock statuses: first few offline, others sleeping
        let initialStatus = "sleeping";
        if (index === 0) initialStatus = "offline"; // Make one device offline for realism
        
        deviceStates[meter.id] = {
          status: initialStatus,
          lastPing: new Date(Date.now() - Math.random() * 86400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
    });

    renderMetersList();
    appendLog(`Loaded ${cache.meters.length} registered hardware telemetry nodes from registry.`, "info");

  } catch (err) {
    console.error("Failed to load meters data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

const appendLog = (message, type = "info") => {
  if (!terminalBody) return;
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const p = document.createElement("p");
  p.className = "log-line";
  p.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-${type}">${message}</span>`;
  
  terminalBody.appendChild(p);
  
  // Auto scroll terminal
  if (terminalConsole) {
    terminalConsole.scrollTop = terminalConsole.scrollHeight;
  }
};

function renderMetersList() {
  const tbody = document.getElementById("wakeup-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (cache.meters.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">No meters registered</td></tr>`;
    return;
  }

  cache.meters.forEach(m => {
    const stateInfo = deviceStates[m.id];
    const row = document.createElement("tr");
    
    // Status badge display
    let badgeClass = "badge-sleeping";
    let statusLabel = "Sleeping";
    let actionBtnDisabled = "";
    
    if (stateInfo.status === "active") {
      badgeClass = "badge-success";
      statusLabel = `<span class="broadcast-dot active"></span> Active`;
      actionBtnDisabled = "disabled";
    } else if (stateInfo.status === "offline") {
      badgeClass = "badge-failed";
      statusLabel = "Offline";
    } else if (stateInfo.status === "waking") {
      badgeClass = "badge-waking";
      statusLabel = "Waking Up...";
      actionBtnDisabled = "disabled";
    }

    row.innerHTML = `
      <td><strong>${m.meter_number}</strong></td>
      <td>${m.location || 'Unknown'}</td>
      <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      <td>
        <button class="btn-wakeup" ${actionBtnDisabled} data-id="${m.id}" data-number="${m.meter_number}">
          <i class="fa-solid fa-rss"></i> <span>Wake Up</span>
        </button>
      </td>
    `;

    // Click listener for individual wake up
    const btn = row.querySelector(".btn-wakeup");
    if (btn && stateInfo.status !== "active" && stateInfo.status !== "waking") {
      btn.addEventListener("click", () => triggerWakeup(m.id, m.meter_number));
    }

    tbody.appendChild(row);
  });
}

// Simulated Async Sleep helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const triggerWakeup = async (meterId, meterNumber) => {
  const stateInfo = deviceStates[meterId];
  if (!stateInfo || stateInfo.status === "active" || stateInfo.status === "waking") return;

  // Set waking status
  stateInfo.status = "waking";
  renderMetersList();
  
  if (terminalStatus) terminalStatus.textContent = "TRANSMITTING";
  
  try {
    appendLog(`[PING] Initiating RF broadcast command to ${meterNumber}...`, "ping");
    await delay(1000);
    
    if (stateInfo.status === "offline" || Math.random() < 0.15) {
      // Simulation of connection error for variety (or if it was previously offline)
      appendLog(`[WARN] No response from ${meterNumber}. Retrying transceiver handshake (Attempt 2)...`, "ping");
      await delay(1200);
      
      if (Math.random() < 0.4 && stateInfo.status !== "offline") {
        // Successful retry
        appendLog(`[INFO] RF link established with module ${meterNumber}.`, "info");
        await delay(800);
        appendLog(`[INFO] Verifying device registers and firmware signature...`, "info");
        await delay(800);
        
        stateInfo.status = "active";
        stateInfo.lastPing = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        appendLog(`[SUCCESS] Device ${meterNumber} is now ONLINE. telemetry-rx: 100%`, "success");
      } else {
        // Final offline failure
        stateInfo.status = "offline";
        appendLog(`[ERROR] Transceiver timeout on ${meterNumber}. Device unreachable.`, "error");
      }
    } else {
      // Normal direct success path
      appendLog(`[INFO] Connection handshake acknowledged by ${meterNumber}.`, "info");
      await delay(800);
      appendLog(`[INFO] Pulling live hardware telemetry diagnostic codes...`, "info");
      await delay(1000);
      
      stateInfo.status = "active";
      stateInfo.lastPing = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      appendLog(`[SUCCESS] Device ${meterNumber} successfully awakened and active.`, "success");
    }
  } catch (err) {
    appendLog(`[ERROR] Broadcast exception: ${err.message}`, "error");
    stateInfo.status = "offline";
  } finally {
    renderMetersList();
    if (terminalStatus) terminalStatus.textContent = "IDLE";
  }
};

const triggerWakeupAll = async () => {
  const sleepingMeters = cache.meters.filter(m => deviceStates[m.id].status === "sleeping" || deviceStates[m.id].status === "offline");
  
  if (sleepingMeters.length === 0) {
    appendLog("All registered devices are already active.", "info");
    return;
  }

  // Disable button during batch process
  if (wakeupAllBtn) {
    wakeupAllBtn.disabled = true;
    wakeupAllBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Waking All...`;
  }
  if (terminalStatus) terminalStatus.textContent = "BATCH TRANSMIT";

  appendLog(`[BATCH] Starting sequence for ${sleepingMeters.length} devices...`, "info");

  for (let m of sleepingMeters) {
    await triggerWakeup(m.id, m.meter_number);
    await delay(500); // short gap between pings
  }

  appendLog("[BATCH] Sequential broadcast completed.", "info");

  if (wakeupAllBtn) {
    wakeupAllBtn.disabled = false;
    wakeupAllBtn.innerHTML = `<i class="fa-solid fa-rss"></i> <span>Wake Up All Devices</span>`;
  }
  if (terminalStatus) terminalStatus.textContent = "IDLE";
};
