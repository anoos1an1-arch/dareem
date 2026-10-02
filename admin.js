import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authCard = document.querySelector("#auth-card");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const authError = document.querySelector("#auth-error");
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
  if (allowed) await loadAdminLinks();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError);

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
      // الحذف عملية تغيّر بيانات بشكل دائم، لذلك نطلب تأكيدًا صريحًا.
      if (!confirm(`حذف الرابط «${item.title}»؟`)) return;
      const { error: deleteError } = await supabase.from("links").delete().eq("id", item.id);
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

supabase.auth.onAuthStateChange(() => refreshAuth());
refreshAuth();
