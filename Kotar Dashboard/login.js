document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginSubmitBtn = document.getElementById("login-submit-btn");
  const authErrorAlert = document.getElementById("auth-error-alert");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    hideAuthError();
    setLoginLoading(true);

    try {
      // Sign in with Supabase
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      await verifyAdminAccess(data.user);
    } catch (err) {
      showAuthError(err.message || "Failed to sign in.");
      setLoginLoading(false);
    }
  }

  async function verifyAdminAccess(user) {
    try {
      // Fetch user profile and check is_admin
      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        throw new Error("Could not fetch user profile details.");
      }

      if (!profile.is_admin) {
        // Sign out immediately if not admin
        await supabaseClient.auth.signOut();
        throw new Error("Access Denied: You do not have administrator privileges.");
      }

      // Successful verification - redirect to overview dashboard
      window.location.href = "index.html";
    } catch (err) {
      showAuthError(err.message || "Access verification failed.");
      setLoginLoading(false);
    }
  }

  function setLoginLoading(isLoading) {
    if (isLoading) {
      loginSubmitBtn.disabled = true;
      loginSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    } else {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.innerHTML = `<span>Sign In</span> <i class="fa-solid fa-arrow-right-to-bracket"></i>`;
    }
  }

  function showAuthError(message) {
    authErrorAlert.textContent = message;
    authErrorAlert.style.display = "block";
  }

  function hideAuthError() {
    authErrorAlert.textContent = "";
    authErrorAlert.style.display = "none";
  }
});
