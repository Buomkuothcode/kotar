// State Variables
let cache = {
  profiles: [],
  complaints: []
};
let selectedComplaint = null;

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
});

const setupEventListeners = () => {
  // Search input
  const searchInput = document.getElementById("complaints-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderComplaintsList);
  }

  // Filter dropdown
  const filterSelect = document.getElementById("complaints-filter-status");
  if (filterSelect) {
    filterSelect.addEventListener("change", renderComplaintsList);
  }

  // Refresh button
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

    // 1. Fetch profiles first so we can map them to complaints manually
    const { data: profilesData, error: pe } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (pe) throw pe;
    cache.profiles = profilesData || [];

    // 2. Fetch complaints with meter details
    const { data: complaintsData, error: ce } = await supabaseClient
      .from("complaints")
      .select("*, meter:meter_id(meter_number, location)")
      .order("created_at", { ascending: false });
    if (ce) throw ce;
    
    // Map profile manually to each complaint
    complaintsData.forEach(c => {
      c.profile = cache.profiles.find(p => p.id === c.user_id) || null;
    });
    cache.complaints = complaintsData || [];

    renderComplaintsList();

    // If there is an active selected complaint, refresh its details view
    if (selectedComplaint) {
      const updated = cache.complaints.find(c => c.id === selectedComplaint.id);
      if (updated) {
        selectComplaint(updated);
      } else {
        selectedComplaint = null;
        renderEmptyState();
      }
    }

  } catch (err) {
    console.error("Failed to load complaints data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

function renderComplaintsList() {
  const searchQuery = document.getElementById("complaints-search").value.toLowerCase();
  const filterStatus = document.getElementById("complaints-filter-status").value;
  const tbody = document.getElementById("complaints-table-body");

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = cache.complaints.filter(c => {
    const userName = c.profile?.full_name?.toLowerCase() || "";
    const userEmail = c.profile?.email?.toLowerCase() || "";
    const title = c.title.toLowerCase();
    const matchesSearch = userName.includes(searchQuery) || userEmail.includes(searchQuery) || title.includes(searchQuery);
    
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">No complaints found</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const row = document.createElement("tr");
    row.className = "clickable";
    if (selectedComplaint && selectedComplaint.id === c.id) {
      row.style.backgroundColor = "#f9fafb";
    }
    
    const date = new Date(c.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    row.innerHTML = `
      <td><strong>${c.profile?.full_name || 'Anonymous'}</strong><br><small style="color: var(--text-muted)">${c.profile?.email || ''}</small></td>
      <td>${c.title}</td>
      <td><span class="badge badge-${c.status.replace('_', '-')}">${c.status.replace('_', ' ')}</span></td>
      <td>${date}</td>
    `;

    row.addEventListener("click", () => selectComplaint(c));
    tbody.appendChild(row);
  });
}

const selectComplaint = (complaint) => {
  selectedComplaint = complaint;
  renderComplaintsList(); // Re-render to highlight selected row
  
  const detailContainer = document.getElementById("complaint-detail-container");
  if (!detailContainer) return;
  
  const dateStr = new Date(complaint.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  detailContainer.innerHTML = `
    <div class="receipt-slip fade-in">
      <div class="tear-off-top"></div>
      
      <div class="receipt-header">
        <div class="headerLeftContainer">
          <div class="receipt-utility">KOTAR UTILITY</div>
          <div class="receipt-type">COMPLAINT DOSSIER</div>
        </div>
        <i class="fa-solid fa-circle-exclamation receipt-icon"></i>
      </div>

      <div class="receipt-dashed-divider"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">COMPLAINT ID:</span>
          <span class="receipt-meta-value">${complaint.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">DATE:</span>
          <span class="receipt-meta-value">${dateStr}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">CUSTOMER:</span>
          <span class="receipt-meta-value">${complaint.profile?.full_name || 'Anonymous'}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">PHONE:</span>
          <span class="receipt-meta-value">${complaint.profile?.phone_number || 'None'}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">ASSOCIATED METER:</span>
          <span class="receipt-meta-value">${complaint.meter?.meter_number || 'General (No Meter)'}</span>
        </div>
        ${complaint.meter?.location ? `
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">METER LOCATION:</span>
          <span class="receipt-meta-value">${complaint.meter.location}</span>
        </div>` : ''}
      </div>

      <div class="receipt-dashed-divider"></div>

      <div class="receipt-body">
        <h4>${complaint.title}</h4>
        <div class="receipt-body-text">${escapeHtml(complaint.description)}</div>
      </div>

      <div class="receipt-dashed-divider"></div>

      <!-- Action: Update Status -->
      <div class="receipt-action-section">
        <label style="display:block; font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Manage Status</label>
        <div style="display:flex; gap:10px;">
          <select id="update-complaint-status-select" class="filter-select" style="flex:1; height:46px;">
            <option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="in_progress" ${complaint.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            <option value="closed" ${complaint.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
          <button id="update-complaint-status-btn" class="btn" style="flex:1; height:46px; border-radius:var(--radius-sm);">
            <span>Update Status</span>
          </button>
        </div>
      </div>

      <div class="tear-off-bottom"></div>
    </div>
  `;

  // Attach submit handler
  document.getElementById("update-complaint-status-btn").addEventListener("click", handleUpdateComplaintStatus);
};

const handleUpdateComplaintStatus = async () => {
  if (!selectedComplaint) return;
  
  const statusSelect = document.getElementById("update-complaint-status-select");
  const newStatus = statusSelect.value;
  const updateBtn = document.getElementById("update-complaint-status-btn");
  
  updateBtn.disabled = true;
  updateBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating...`;

  try {
    const { error } = await supabaseClient
      .from("complaints")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", selectedComplaint.id);

    if (error) throw error;
    
    // Reload local data and update state
    await loadAllData();
    alert("Complaint status updated successfully!");
  } catch (err) {
    alert("Error updating status: " + err.message);
  } finally {
    updateBtn.disabled = false;
    updateBtn.innerHTML = `<span>Update Status</span>`;
  }
};

const renderEmptyState = () => {
  const detailContainer = document.getElementById("complaint-detail-container");
  if (detailContainer) {
    detailContainer.innerHTML = `
      <div class="empty-detail-state">
        <i class="fa-solid fa-circle-info"></i>
        <p>Select a complaint from the list to view full details and update status.</p>
      </div>
    `;
  }
};

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
