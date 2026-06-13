// State and Cache
let cache = {
  profiles: [],
  meters: [],
  payments: [],
  complaints: []
};

let revenueChart = null;
let consumptionChart = null;

// DOM Elements
const refreshDataBtn = document.getElementById("refresh-data-btn");

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

    // 2. Fetch complaints
    const { data: complaintsData, error: ce } = await supabaseClient
      .from("complaints")
      .select("*, meter:meter_id(meter_number, location)")
      .order("created_at", { ascending: false });
    if (ce) throw ce;
    cache.complaints = complaintsData || [];

    // 3. Fetch meters
    const { data: metersData, error: me } = await supabaseClient
      .from("meters")
      .select("*")
      .order("created_at", { ascending: false });
    if (me) throw me;
    cache.meters = metersData || [];

    // 4. Fetch payments
    const { data: paymentsData, error: payE } = await supabaseClient
      .from("payments")
      .select("*, meter:meter_id(meter_number)")
      .order("created_at", { ascending: false });
    if (payE) throw payE;
    cache.payments = paymentsData || [];

    // Update UI components
    updateSummaryStats();
    renderCharts();

  } catch (err) {
    console.error("Failed to load overview dashboard data", err);
    alert("Error fetching database records: " + (err.message || JSON.stringify(err)));
  } finally {
    window.hidePageLoader();
  }
};

const updateSummaryStats = () => {
  // Total Users
  document.getElementById("stat-total-users").textContent = cache.profiles.length;
  // Active Meters
  document.getElementById("stat-total-meters").textContent = cache.meters.length;
  
  // Total Revenue (Successful payments)
  const successfulPayments = cache.payments.filter(p => p.status === "success");
  const totalRevenue = successfulPayments.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
  document.getElementById("stat-total-revenue").textContent = totalRevenue.toFixed(2) + " ETB";

  // Open Complaints (pending or in_progress status)
  const openComplaints = cache.complaints.filter(c => c.status === "pending" || c.status === "in_progress");
  document.getElementById("stat-open-complaints").textContent = openComplaints.length;
};

const renderCharts = () => {
  const successfulPayments = cache.payments.filter(p => p.status === "success");
  const monthlyData = {}; // key: YYYY-MM, value: { revenue, consumption }

  successfulPayments.forEach(p => {
    const key = p.month_key;
    if (!key) return;
    if (!monthlyData[key]) {
      monthlyData[key] = { revenue: 0, consumption: 0 };
    }
    monthlyData[key].revenue += parseFloat(p.total_amount || 0);
    monthlyData[key].consumption += parseFloat(p.consumption || 0);
  });

  // Sort months
  const sortedMonths = Object.keys(monthlyData).sort();
  const revenueValues = sortedMonths.map(m => monthlyData[m].revenue);
  const consumptionValues = sortedMonths.map(m => monthlyData[m].consumption);
  
  // Convert YYYY-MM key to friendly name, e.g. "Dec 2025"
  const friendlyMonths = sortedMonths.map(m => {
    const [year, month] = m.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  });

  // 1. REVENUE CHART (LINE CHART)
  if (revenueChart) revenueChart.destroy();
  const revCanvas = document.getElementById("revenue-chart");
  if (revCanvas) {
    const revCtx = revCanvas.getContext("2d");
    revenueChart = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: friendlyMonths.length > 0 ? friendlyMonths : ["No Data Available"],
        datasets: [{
          label: 'Monthly Revenue Collected (ETB)',
          data: revenueValues.length > 0 ? revenueValues : [0],
          borderColor: '#006442',
          backgroundColor: 'rgba(0, 100, 66, 0.05)',
          borderWidth: 2,
          tension: 0.2,
          fill: true,
          pointBackgroundColor: '#006442'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // 2. CONSUMPTION CHART (BAR CHART)
  if (consumptionChart) consumptionChart.destroy();
  const consCanvas = document.getElementById("consumption-chart");
  if (consCanvas) {
    const consCtx = consCanvas.getContext("2d");
    consumptionChart = new Chart(consCtx, {
      type: 'bar',
      data: {
        labels: friendlyMonths.length > 0 ? friendlyMonths : ["No Data Available"],
        datasets: [{
          label: 'Power Consumed (kWh)',
          data: consumptionValues.length > 0 ? consumptionValues : [0],
          backgroundColor: '#e6f0ec',
          borderColor: '#006442',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
};
