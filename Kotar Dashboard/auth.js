// Supabase Config (retrieved from the application's config)
const SUPABASE_URL = "https://apwvpnpdwkavrujqefxf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwd3ZwbnBkd2thdnJ1anFlZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTU3NTAsImV4cCI6MjA4MjEzMTc1MH0.78Imt1wKpF7aTfqFLy3IMewzGd6oPsLWutvsAPLa3Go";

// Initialize Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Loader Functions
window.showPageLoader = () => {
  const loader = document.getElementById("page-loader");
  if (loader) {
    loader.classList.remove("fade-out");
  }
};

// Global function to hide the loader with a smooth fade
window.hidePageLoader = () => {
  const loader = document.getElementById("page-loader");
  if (loader) {
    loader.classList.add("fade-out");
  }
};

// Redirect and session verification logic
const checkSession = async () => {
  const isLoginPage = window.location.pathname.endsWith("login.html");
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    try {
      // Fetch user profile and check is_admin
      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        throw new Error("Could not fetch user profile details.");
      }

      if (!profile.is_admin) {
        // Sign out immediately if not admin
        await supabaseClient.auth.signOut();
        throw new Error("Access Denied: You do not have administrator privileges.");
      }

      // Valid admin session
      if (isLoginPage) {
        window.location.href = "index.html";
      } else {
        // Display admin info in the sidebar
        const displayEl = document.getElementById("admin-email-display");
        if (displayEl) {
          displayEl.textContent = profile.full_name || session.user.email;
        }

        // Setup signout button listener
        const signoutBtn = document.getElementById("signout-btn");
        if (signoutBtn) {
          signoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = "login.html";
          });
        }

        // Make the dashboard container visible
        const dashboardContainer = document.getElementById("dashboard-container");
        if (dashboardContainer) {
          dashboardContainer.style.display = "flex";
        }
      }
    } catch (err) {
      console.error("Authentication check failed:", err.message);
      await supabaseClient.auth.signOut();
      if (!isLoginPage) {
        window.location.href = "login.html";
      } else {
        window.hidePageLoader();
      }
    }
  } else {
    // No active session
    if (!isLoginPage) {
      window.location.href = "login.html";
    } else {
      // If we are on the login page and there is no session, show the login form by hiding the loader
      window.hidePageLoader();
    }
  }
};

// Check session immediately on script load
document.addEventListener("DOMContentLoaded", () => {
  checkSession();
});
