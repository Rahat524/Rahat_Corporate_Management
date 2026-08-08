from pathlib import Path

path = Path("static/app.js")
text = path.read_text(encoding="utf-8")

old_nav = '''document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active");if($("pageTitle"))$("pageTitle").textContent=b.textContent});'''

new_nav = '''const loadedPages=new Set();

async function loadPageOnDemand(page,force=false){
 if(!force&&loadedPages.has(page))return;

 try{
  switch(page){
   case "dashboard":
    if(can("dashboard_view"))await loadDashboard();
    break;

   case "corporate":
    if(can("customer_view"))await Promise.all([
     loadCustomers(),
     loadCorporate()
    ]);
    break;

   case "duplicates":
    if(can("duplicate_view"))await loadDuplicates();
    break;

   case "vendors":
    if(can("vendor_view"))await loadVendors();
    break;

   case "vendorLedger":
    if(can("ledger_view"))await Promise.all([
     loadVendors(),
     loadVendorLedger()
    ]);
    break;

   case "headCash":
    if(can("cash_view"))await loadCash("Head Cash");
    break;

   case "pettyCash":
    if(can("cash_view"))await loadCash("Petty Cash");
    break;

   case "deletedCash":
    if(can("cash_view"))await loadDeletedCash();
    break;

   case "lostFound":
    if(can("cash_view"))await loadSpecialCash("lostFound","lost_found");
    break;

   case "theftCash":
    if(can("cash_view"))await loadSpecialCash("theftCash","theft");
    break;

   case "cashierDashboard":
    if(can("cashier_view"))await loadCashierDashboard();
    break;

   case "cashierClosing":
    if(can("cashier_view"))await Promise.all([
     loadCashierClosing(),
     loadCashierEmployees()
    ]);
    break;

   case "cashierShortage":
    if(can("cashier_view"))await loadCashierShortage();
    break;

   case "cashierNotes":
    if(can("cashier_view"))await loadCashierNotes();
    break;

   case "users":
    if(can("user_manage"))await loadUsers();
    break;

   case "audit":
    if(can("audit_view"))await loadAudit();
    break;

   case "exceptions":
    if(can("audit_view"))await loadExceptions();
    break;

   case "aging":
    if(can("audit_view"))await loadAging();
    break;

   case "returnCounter":
    if(can("return_view"))await Promise.all([
     loadReturnApprovers(),
     loadReturnEntries()
    ]);
    break;
  }

  loadedPages.add(page);
 }catch(error){
  console.error("Page loading error:",page,error);
 }
}

document.querySelectorAll(".nav").forEach(b=>b.onclick=async()=>{
 document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");

 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));

 const page=b.dataset.page;
 const target=$(page);

 if(target)target.classList.add("active");
 if($("pageTitle"))$("pageTitle").textContent=b.textContent;

 await loadPageOnDemand(page);
});'''

if old_nav not in text:
    raise SystemExit(
        "ERROR: Navigation code not found. app.js may be a different version."
    )

text = text.replace(old_nav, new_nav, 1)

start = text.find("async function init(){")
end = text.find("async function loadStores(){", start)

if start == -1 or end == -1:
    raise SystemExit("ERROR: init function location not found.")

new_init = '''async function init(){
 currentUser=await api("/api/me");
 applyPermissions();
 keepExcelAutoUpdateVisible();

 await loadStores();

 if($("welcomeUser")){
  $("welcomeUser").textContent=
   `Welcome ${currentUser.full_name} — ${currentUser.role_name}`;
 }

 /*
  Performance fix:
  Login par sirf dashboard load hoga.
  Baqi modules folder click par load honge.
 */
 await loadNetwork();

 if(can("dashboard_view")){
  await loadPageOnDemand("dashboard",true);
 }

 loadedPages.add("dashboard");

 if($("txDate")){
  $("txDate").value=new Date().toISOString().slice(0,10);
 }

 if($("corpEntryDate")){
  $("corpEntryDate").value=new Date().toISOString().slice(0,10);
 }

 renderPermissionGrid();
 setupBulkEntry();
}

'''

text = text[:start] + new_init + text[end:]

# Heavy one-second background processing ko 30 seconds kar dein.
text = text.replace(
    "setInterval(updateAdvancedContext,1000)",
    "setInterval(updateAdvancedContext,30000)"
)

path.write_text(text, encoding="utf-8")

print("========================================")
print("PERFORMANCE UPDATE COMPLETED")
print("Lazy loading enabled")
print("Login bulk loading removed")
print("1-second processing changed to 30 seconds")
print("========================================")
