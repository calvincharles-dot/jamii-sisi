

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const SUPABASE_URL = sb_publishable__WS_9cqNJ-Vn-qXYMNTe1A_QNVsINzV
const SUPABASE_PUBLISHABLE_KEY = "https://clupzeidmquevmnplezc.supabase.co";
const configured = !SUPABASE_URL.startsWith("sb_publishable_") && !SUPABASE_PUBLISHABLE_KEY.startsWith("");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

function money(value) {
  return new Intl.NumberFormat("sw-TZ", { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(Number(value || 0));
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function productCard(p) {
  const image = p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="">` : "J&S";
  return `<article class="product-card"><div class="product-image">${image}</div><div class="product-info"><span class="pill">${p.product_type === "free" ? "BURE" : "PREMIUM"}</span><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description || "Bidhaa ya kidijitali kutoka JAMII&SISI.")}</p><div class="price">${p.product_type === "free" ? "Bure" : money(p.price)}</div>${p.product_type === "free" ? '<span class="muted">Pakua bure — upatikanaji utawezeshwa baada ya kuunganisha faili.</span>' : '<span class="muted">Nunua — mfumo wa malipo unaandaliwa.</span>'}</div></article>`;
}
async function loadProducts() {
  if (!supabase) {
    $("productGrid").innerHTML = '<p class="muted">Unganisha Supabase ili bidhaa zionekane. Fungua app.js na weka Project URL pamoja na Publishable Key.</p>';
    return;
  }
  const { data, error } = await supabase.from("products").select("id,name,product_type,description,category,price,currency,image_url").eq("is_active", true).order("created_at", { ascending: false });
  if (error) {
    $("productGrid").innerHTML = `<p class="muted">Imeshindikana kupakia bidhaa: ${escapeHtml(error.message)}</p>`;
    return;
  }
  $("productGrid").innerHTML = data.length ? data.map(productCard).join("") : '<p class="muted">Bado hakuna bidhaa. Zitaonekana hapa baada ya Admin kuziongeza.</p>';
}
function showModal() { $("adminModal").classList.remove("hidden"); }
function hideModal() { $("adminModal").classList.add("hidden"); }
$("adminOpen").addEventListener("click", showModal);
$("closeAdmin").addEventListener("click", hideModal);
$("adminModal").addEventListener("click", e => { if (e.target === $("adminModal")) hideModal(); });

async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return !error && !!data;
}
async function refreshAdminProducts() {
  const { data, error } = await supabase.from("products").select("id,name,product_type,price").order("created_at", { ascending: false });
  if (error) { $("adminProducts").textContent = error.message; return; }
  $("adminProducts").innerHTML = data.length ? data.map(p => `<div class="admin-row"><span><b>${escapeHtml(p.name)}</b><br>${p.product_type === "free" ? "Bure" : money(p.price)}</span><button data-delete="${p.id}">Futa</button></div>`).join("") : '<p class="muted">Hakuna bidhaa bado.</p>';
  $("adminProducts").querySelectorAll("[data-delete]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Una uhakika unataka kufuta bidhaa hii?")) return;
    const { error } = await supabase.from("products").delete().eq("id", btn.dataset.delete);
    if (error) alert("Imeshindikana: " + error.message);
    await refreshAdminProducts(); await loadProducts();
  }));
}
async function showDashboard() {
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  await refreshAdminProducts();
}
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!supabase) { $("loginMessage").textContent = "Kwanza weka Supabase URL na Publishable Key ndani ya app.js."; return; }
  $("loginMessage").textContent = "Inathibitisha...";
  const { error } = await supabase.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) { $("loginMessage").textContent = error.message; return; }
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    $("loginMessage").textContent = "Akaunti hii haina ruhusa ya Admin.";
    return;
  }
  $("loginMessage").textContent = "";
  await showDashboard();
});
$("logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  $("dashboardView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  $("loginForm").reset();
});
$("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!(await isAdmin())) { $("productMessage").textContent = "Tafadhali ingia tena kama Admin."; return; }
  const type = $("ptype").value;
  const price = type === "free" ? 0 : Number($("price").value);
  if (type === "premium" && price <= 0) { $("productMessage").textContent = "Bidhaa ya Premium lazima iwe na bei zaidi ya sifuri."; return; }
  const record = {
    name: $("pname").value.trim(),
    product_type: type,
    price,
    currency: "TZS",
    category: $("category").value.trim() || null,
    description: $("description").value.trim() || null,
    image_url: $("imageUrl").value.trim() || null,
    is_active: true
  };
  const { error } = await supabase.from("products").insert(record);
  $("productMessage").textContent = error ? "Hitilafu: " + error.message : "Bidhaa imehifadhiwa.";
  if (!error) { $("productForm").reset(); $("price").value = "0"; await refreshAdminProducts(); await loadProducts(); }
});
$("ptype").addEventListener("change", () => { $("price").disabled = $("ptype").value === "free"; if ($("ptype").value === "free") $("price").value = "0"; });
loadProducts();
