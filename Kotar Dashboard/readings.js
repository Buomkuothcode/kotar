// State Variables
let cache = {
  readings: []
};

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
});

const setupEventListeners = () => {
  const searchInput = document.getElementById("readings-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderReadingsAndOcr);
  }

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
};

const loadAllData = async () => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return; // auth.js will handle redirect

    // Fetch readings with meter and ocr_logs join
    const { data: readingsData, error: re } = await supabaseClient
      .from("meter_readings")
      .select("*, meter:meter_id(meter_number), ocr_logs(confidence, raw_text)")
      .order("reading_date", { ascending: false });
    if (re) throw re;
    cache.readings = readingsData || [];

    renderReadingsAndOcr();

  } catch (err) {
    console.error("Failed to load readings data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

function renderReadingsAndOcr() {
  const searchQuery = document.getElementById("readings-search").value.toLowerCase();
  const tbody = document.getElementById("readings-table-body");

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = cache.readings.filter(r => {
    return (r.meter?.meter_number || "").toLowerCase().includes(searchQuery);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No readings found</td></tr>`;
    return;
  }

  filtered.forEach(r => {
    const row = document.createElement("tr");
    
    const dateStr = new Date(r.reading_date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Extract OCR logs details if present
    const ocrObj = Array.isArray(r.ocr_logs) ? r.ocr_logs[0] : r.ocr_logs;
    
    let ocrConfidenceDisplay = "—";
    let ocrTextDisplay = "—";
    
    if (ocrObj) {
      const confidencePercent = (parseFloat(ocrObj.confidence) * 100).toFixed(0);
      let colorClass = "badge-success";
      if (confidencePercent < 50) colorClass = "badge-failed";
      else if (confidencePercent < 85) colorClass = "badge-pending";
      
      ocrConfidenceDisplay = `<span class="badge ${colorClass}">${confidencePercent}%</span>`;
      ocrTextDisplay = `<small style="font-family: monospace;">"${escapeHtml(ocrObj.raw_text)}"</small>`;
    }

    row.innerHTML = `
      <td><strong>${r.meter?.meter_number || 'Unknown'}</strong></td>
      <td>${dateStr}</td>
      <td style="font-family: monospace; font-weight:700; color: var(--primary);">${parseFloat(r.value).toFixed(2)} kWh</td>
      <td>${ocrConfidenceDisplay}</td>
      <td>${ocrTextDisplay}</td>
    `;
    tbody.appendChild(row);
  });
}

// Helpers
const escapeHtml = (text) => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
