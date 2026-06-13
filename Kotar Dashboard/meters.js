// State Variables
let cache = {
  profiles: [],
  meters: []
};

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
});

const setupEventListeners = () => {
  const usersSearchInput = document.getElementById("users-search");
  if (usersSearchInput) {
    usersSearchInput.addEventListener("input", renderUsersAndMeters);
  }

  const metersSearchInput = document.getElementById("meters-search");
  if (metersSearchInput) {
    metersSearchInput.addEventListener("input", renderUsersAndMeters);
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

    // 1. Fetch profiles
    const { data: profilesData, error: pe } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (pe) throw pe;
    cache.profiles = profilesData || [];

    // 2. Fetch meters
    const { data: metersData, error: me } = await supabaseClient
      .from("meters")
      .select("*")
      .order("created_at", { ascending: false });
    if (me) throw me;
    
    // Map profile manually to each meter
    metersData.forEach(m => {
      m.profile = cache.profiles.find(p => p.id === m.user_id) || null;
    });
    cache.meters = metersData || [];

    renderUsersAndMeters();

  } catch (err) {
    console.error("Failed to load meters data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

function renderUsersAndMeters() {
  const usersSearch = document.getElementById("users-search").value.toLowerCase();
  const metersSearch = document.getElementById("meters-search").value.toLowerCase();
  
  const usersTbody = document.getElementById("users-table-body");
  const metersTbody = document.getElementById("meters-table-body");

  if (usersTbody) {
    usersTbody.innerHTML = "";
    const filteredUsers = cache.profiles.filter(p => {
      return (p.full_name?.toLowerCase() || "").includes(usersSearch) ||
             (p.email?.toLowerCase() || "").includes(usersSearch) ||
             (p.phone_number?.toLowerCase() || "").includes(usersSearch);
    });

    if (filteredUsers.length === 0) {
      usersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">No users found</td></tr>`;
    } else {
      filteredUsers.forEach(u => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${u.full_name || 'No Name'}</strong></td>
          <td>${u.email || ''}</td>
          <td>${u.phone_number || 'None'}</td>
          <td>${u.is_admin ? '<i class="fa-solid fa-user-shield" style="color: var(--primary)"></i> Yes' : 'No'}</td>
        `;
        usersTbody.appendChild(row);
      });
    }
  }

  if (metersTbody) {
    metersTbody.innerHTML = "";
    const filteredMeters = cache.meters.filter(m => {
      return (m.meter_number || "").toLowerCase().includes(metersSearch) ||
             (m.location || "").toLowerCase().includes(metersSearch) ||
             (m.profile?.full_name || "").toLowerCase().includes(metersSearch);
    });

    if (filteredMeters.length === 0) {
      metersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">No meters found</td></tr>`;
    } else {
      filteredMeters.forEach(m => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${m.meter_number}</strong></td>
          <td>${m.location || 'Unknown'}</td>
          <td><small style="color: var(--text-muted)">${m.description || 'None'}</small></td>
          <td>${m.profile?.full_name || 'Unassigned'}<br><small style="color: var(--text-muted)">${m.profile?.email || ''}</small></td>
        `;
        metersTbody.appendChild(row);
      });
    }
  }
}
