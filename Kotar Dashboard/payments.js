// State Variables
let cache = {
  profiles: [],
  payments: []
};
let selectedPayment = null;

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  loadAllData();
});

const setupEventListeners = () => {
  const searchInput = document.getElementById("payments-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderPaymentsList);
  }

  const filterSelect = document.getElementById("payments-filter-status");
  if (filterSelect) {
    filterSelect.addEventListener("change", renderPaymentsList);
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

    // 1. Fetch profiles first so we can map them manually
    const { data: profilesData, error: pe } = await supabaseClient
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });
    if (pe) throw pe;
    cache.profiles = profilesData || [];

    // 2. Fetch payments with meter details
    const { data: paymentsData, error: payE } = await supabaseClient
      .from("payments")
      .select("*, meter:meter_id(meter_number)")
      .order("created_at", { ascending: false });
    if (payE) throw payE;

    // Map profile manually to each payment
    paymentsData.forEach(p => {
      p.profile = cache.profiles.find(prof => prof.id === p.user_id) || null;
    });
    cache.payments = paymentsData || [];

    renderPaymentsList();

    // If there is an active selected payment, refresh its details view
    if (selectedPayment) {
      const updated = cache.payments.find(p => p.id === selectedPayment.id);
      if (updated) {
        selectPayment(updated);
      } else {
        selectedPayment = null;
        renderEmptyState();
      }
    }

  } catch (err) {
    console.error("Failed to load payments data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

function renderPaymentsList() {
  const searchQuery = document.getElementById("payments-search").value.toLowerCase();
  const filterStatus = document.getElementById("payments-filter-status").value;
  const tbody = document.getElementById("payments-table-body");

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = cache.payments.filter(p => {
    const userName = p.profile?.full_name?.toLowerCase() || "";
    const userEmail = p.profile?.email?.toLowerCase() || "";
    const ref = p.transaction_ref?.toLowerCase() || "";
    const matchesSearch = userName.includes(searchQuery) || userEmail.includes(searchQuery) || ref.includes(searchQuery);
    
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">No payments logged</td></tr>`;
    return;
  }

  filtered.forEach(p => {
    const row = document.createElement("tr");
    row.className = "clickable";
    if (selectedPayment && selectedPayment.id === p.id) {
      row.style.backgroundColor = "#f9fafb";
    }

    // Friendly month name
    const [year, month] = p.month_key.split("-");
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
      year: "numeric"
    });

    row.innerHTML = `
      <td><strong>${p.profile?.full_name || 'Unknown'}</strong><br><small style="color: var(--text-muted)">${p.profile?.email || ''}</small></td>
      <td>${monthName}</td>
      <td style="font-family: monospace;">${parseFloat(p.consumption).toFixed(2)}</td>
      <td style="font-family: monospace; font-weight:700;">${parseFloat(p.total_amount).toFixed(2)} ETB</td>
      <td><span class="badge ${p.status === 'success' ? 'badge-success' : p.status === 'pending' ? 'badge-pending' : 'badge-failed'}">${p.status}</span></td>
    `;

    row.addEventListener("click", () => selectPayment(p));
    tbody.appendChild(row);
  });
}

const selectPayment = (payment) => {
  selectedPayment = payment;
  renderPaymentsList(); // Re-render to highlight selected row
  
  const detailContainer = document.getElementById("payment-detail-container");
  if (!detailContainer) return;
  
  const dateStr = payment.paid_at ? new Date(payment.paid_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : "UNPAID";

  const [year, month] = payment.month_key.split("-");
  const billingMonthStr = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  detailContainer.innerHTML = `
    <div class="receipt-slip fade-in">
      <div class="tear-off-top"></div>
      
      <div class="receipt-header">
        <div class="headerLeftContainer">
          <div class="receipt-utility">KOTAR UTILITY</div>
          <div class="receipt-type">INVOICE RECEIPT</div>
        </div>
        <i class="fa-solid fa-receipt receipt-icon"></i>
      </div>

      <div class="receipt-dashed-divider"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">TRANSACTION REF:</span>
          <span class="receipt-meta-value" style="font-size:11px;">${payment.transaction_ref || 'PENDING'}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">CUSTOMER:</span>
          <span class="receipt-meta-value">${payment.profile?.full_name || 'Unknown'}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">METER NUMBER:</span>
          <span class="receipt-meta-value">${payment.meter?.meter_number || 'Unknown'}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">BILLING CYCLE:</span>
          <span class="receipt-meta-value">${billingMonthStr}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">PAYMENT METHOD:</span>
          <span class="receipt-meta-value">${(payment.payment_method || 'Chapa').toUpperCase()}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">STATUS:</span>
          <span class="receipt-meta-value" style="color: ${payment.status === 'success' ? 'var(--success)' : 'var(--danger)'};">${payment.status.toUpperCase()}</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">PAID DATE:</span>
          <span class="receipt-meta-value">${dateStr}</span>
        </div>
      </div>

      <div class="receipt-dashed-divider"></div>

      <!-- LCD Power Consumption details -->
      <div class="lcd-wrapper">
        <label>POWER CONSUMED</label>
        <div class="lcd-panel">
          <span class="lcd-value">${parseFloat(payment.consumption).toFixed(2)}</span>
          <span class="lcd-unit">kWh</span>
        </div>
      </div>

      <div class="receipt-dashed-divider"></div>

      <div class="receipt-meta">
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">ENERGY CHARGE:</span>
          <span class="receipt-meta-value">${parseFloat(payment.energy_cost).toFixed(2)} ETB</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">SERVICE FEE:</span>
          <span class="receipt-meta-value">${parseFloat(payment.service_fee).toFixed(2)} ETB</span>
        </div>
        <div class="receipt-meta-row">
          <span class="receipt-meta-label">VAT (15%):</span>
          <span class="receipt-meta-value">${parseFloat(payment.vat).toFixed(2)} ETB</span>
        </div>
        
        <div class="receipt-dashed-divider" style="margin: 8px 0;"></div>

        <div class="receipt-meta-row" style="font-size: 16px;">
          <span class="receipt-meta-label" style="font-weight:900; color: var(--text-dark);">GRAND TOTAL:</span>
          <span class="receipt-meta-value" style="font-weight:900; color: var(--primary); font-size:18px;">${parseFloat(payment.total_amount).toFixed(2)} ETB</span>
        </div>
      </div>

      <div class="tear-off-bottom"></div>
    </div>
  `;
};

const renderEmptyState = () => {
  const detailContainer = document.getElementById("payment-detail-container");
  if (detailContainer) {
    detailContainer.innerHTML = `
      <div class="empty-detail-state">
        <i class="fa-solid fa-receipt"></i>
        <p>Select a payment transaction from the list to view the full invoice receipt.</p>
      </div>
    `;
  }
};
