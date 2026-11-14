PAUS_BOOT(async () => {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const setup = document.getElementById("setupNote");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  if (!PAUS_BACKEND.isConfigured()) {
    setup.hidden = false;

    if (!local) {
      const initError = PAUS_BACKEND.getInitError?.();
      form.querySelector("button[type=submit]").disabled = true;
      errorBox.textContent =
        initError?.message ||
        "Supabase chưa kết nối được. Kiểm tra Project URL và Publishable key.";
    } else {
      emailInput.required = false;
      passwordInput.required = false;
      setup.innerHTML="<strong>Bản dùng thử trên máy này</strong>Bạn có thể vào xem mà không cần tài khoản. Thay đổi chỉ lưu trong trình duyệt.";
      emailInput.placeholder = "Không cần email ở bản dùng thử";
      passwordInput.placeholder = "Không cần mật khẩu ở bản dùng thử";
    }
  } else {
    const check = await PAUS_ADMIN_API.requireAdmin();
    if (check.ok) {
      location.replace("/admin/index.html");
    } else if (check.reason === "admin-check-error") {
      setup.hidden = false;
      errorBox.textContent =
        check.error?.message ||
        "Không đọc được bảng admins. Hãy chạy supabase/schema.sql.";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.textContent = "";

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Đang đăng nhập…";

    try {
      const formData = new FormData(form);
      const result = await PAUS_ADMIN_API.signIn(
        formData.get("email"),
        formData.get("password"),
      );

      if (!result.ok) {
        errorBox.textContent = result.error || "Không thể đăng nhập.";
        return;
      }

      location.replace("/admin/index.html");
    } catch (error) {
      errorBox.textContent = error.message || "Không thể đăng nhập.";
    } finally {
      button.disabled = false;
      button.textContent = "Đăng nhập quản trị ↗";
    }
  });
});
