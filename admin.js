import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authCard = document.querySelector("#auth-card");
const resetCard = document.querySelector("#reset-card");
const dashboard = document.querySelector("#dashboard");

const loginForm = document.querySelector("#login-form");
const forgotPassword = document.querySelector("#forgot-password");
const authError = document.querySelector("#auth-error");
const authMessage = document.querySelector("#auth-message");

const resetForm = document.querySelector("#reset-form");
const newPassword = document.querySelector("#new-password");
const newPasswordConfirm = document.querySelector("#new-password-confirm");
const resetError = document.querySelector("#reset-error");
const resetMessage = document.querySelector("#reset-message");

const linkForm = document.querySelector("#link-form");
const saveError = document.querySelector("#save-error");
const adminLinks = document.querySelector("#admin-links");

const editId = document.querySelector("#edit-id");
const titleInput = document.querySelector("#link-title");
const urlInput = document.querySelector("#link-url");
const iconInput = document.querySelector("#link-icon");

function showError(el, message = "") {
  el.textContent = message;
}

function showMessage(el, message = "") {
  el.textContent = message;
}

async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return false;
  }
  return Boolean(data);
}

async function refreshAuth() {
  const allowed = await isAdmin();
  authCard.classList.toggle("hidden", allowed);
  dashboard.classList.toggle("hidden", !allowed);

  if (allowed) {
    resetCard.classList.add("hidden");
    await loadAdminLinks();
  }
}

function showResetCard() {
  authCard.classList.add("hidden");
  dashboard.classList.add("hidden");
  resetCard.classList.remove("hidden");
  showError(resetError);
  showMessage(resetMessage);
  newPassword.focus();
}

forgotPassword.addEventListener("click", async () => {
  showError(authError);
  showMessage(authMessage);

  const email = document.querySelector("#email").value.trim();
  if (!email) {
    showError(authError, "اكتب بريدك الإلكتروني أولًا.");
    return;
  }

  forgotPassword.disabled = true;

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  forgotPassword.disabled = false;

  if (error) {
    showError(authError, "تعذر إرسال رسالة إعادة التعيين.");
    console.error(error);
    return;
  }

  showMessage(authMessage, "تم إرسال رسالة إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError);
  showMessage(authMessage);

  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector("#email").value.trim(),
    password: document.querySelector("#password").value
  });

  if (error) {
    showError(authError, "بيانات الدخول غير صحيحة أو الحساب غير مصرح له.");
    return;
  }

  await refreshAuth();
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(resetError);
  showMessage(resetMessage);

  const password = newPassword.value;
  const confirmation = newPasswordConfirm.value;

  if (password.length < 6) {
    showError(resetError, "كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    return;
  }

  if (password !== confirmation) {
    showError(resetError, "كلمتا المرور غير متطابقتين.");
    return;
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    showError(resetError, "تعذر تحديث كلمة المرور.");
    console.error(error);
    return;
  }

  resetForm.reset();
  showMessage(resetMessage, "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
  setTimeout(async () => {
    await supabase.auth.signOut();
    resetCard.classList.add("hidden");
    authCard.classList.remove("hidden");
    document.querySelector("#email").focus();
  }, 1200);
});

document.querySelector("#logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  await refreshAuth();
});

document.querySelector("#cancel-edit").addEventListener("click", () => {
  linkForm.reset();
  editId.value = "";
  saveError.textContent = "";
});

linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(saveError);

  if (!(await isAdmin())) {
    showError(saveError, "هذا الحساب غير مصرح له بالتعديل.");
    return;
  }

  const payload = {
    title: titleInput.value.trim(),
    url: urlInput.value.trim(),
    icon: iconInput.value.trim() || "↗"
  };

  if (!/^https?:\/\//i.test(payload.url)) {
    showError(saveError, "الرابط يجب أن يبدأ بـ https:// أو http://");
    return;
  }

  let result;

  if (editId.value) {
    result = await supabase.from("links").update(payload).eq("id", editId.value);
  } else {
    const { data: last } = await supabase
      .from("links")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    payload.sort_order = (last?.sort_order ?? 0) + 1;
    result = await supabase.from("links").insert(payload);
  }

  if (result.error) {
    showError(saveError, "تعذر حفظ الرابط. تحقق من إعدادات Supabase.");
    console.error(result.error);
    return;
  }

  linkForm.reset();
  editId.value = "";
  await loadAdminLinks();
});

async function loadAdminLinks() {
  const { data, error } = await supabase
    .from("links")
    .select("id,title,url,icon,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    adminLinks.textContent = "تعذر تحميل الروابط.";
    console.error(error);
    return;
  }

  adminLinks.replaceChildren();

  for (const item of data ?? []) {
    const row = document.createElement("div");
    row.className = "admin-row";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.title;
    const url = document.createElement("small");
    url.textContent = item.url;
    info.append(title, url);

    const actions = document.createElement("div");
    actions.className = "row-actions";

    const edit = document.createElement("button");
    edit.className = "ghost";
    edit.textContent = "تعديل";
    edit.addEventListener("click", () => {
      editId.value = item.id;
      titleInput.value = item.title;
      urlInput.value = item.url;
      iconInput.value = item.icon || "";
      titleInput.focus();
    });

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.textContent = "حذف";
    remove.addEventListener("click", async () => {
      if (!confirm(`حذف الرابط «${item.title}»؟`)) return;

      const { error: deleteError } = await supabase
        .from("links")
        .delete()
        .eq("id", item.id);

      if (deleteError) {
        showError(saveError, "تعذر حذف الرابط.");
        return;
      }

      await loadAdminLinks();
    });

    actions.append(edit, remove);
    row.append(info, actions);
    adminLinks.append(row);
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showResetCard();
    return;
  }

  refreshAuth();
});

refreshAuth();
