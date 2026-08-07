let currentUser=null,editingVendorId=null,editingUserId=null;const RIGHTS_MODULES=["dashboard", "corporate_customers", "vendor_management", "head_cash", "petty_cash", "cashier_closing", "return_counter", "lost_found", "theft", "documents_data", "reports", "security_users"];const RIGHTS_ACTIONS=["view", "add", "edit", "delete", "print", "export"];const ALL_PERMISSIONS=RIGHTS_MODULES.flatMap(m=>RIGHTS_ACTIONS.map(a=>`${m}_${a}`));

const PAGE_SHORTCUTS={
  DS:"dashboard",
  CC:"corporate",
  VL:"vendorLedger",
  HC:"headCash",
  PC:"pettyCash",
  DD:"duplicates",
  SV:"vendors",
  DE:"deletedCash",
  UR:"users",
  AL:"audit",
  SB:"settings",
  CD:"cashierDashboard",
  CL:"cashierClosing",
  CS:"cashierShortage",
  CN:"cashierNotes"
};
function openPageById(pageId){
  const btn=[...document.querySelectorAll(".nav")].find(b=>b.dataset.page===pageId);
  if(!btn||btn.classList.contains("hidden")||btn.style.display==="none"){
    alert("You do not have permission to open this page.");
    return false;
  }
  btn.click();
  btn.scrollIntoView({block:"nearest"});
  window.scrollTo({top:0,left:0,behavior:"smooth"});
  return true;
}
function handleGlobalShortcut(event){
  if(event.key!=="Enter")return;
  const input=event.target;
  const code=(input.value||"").trim().toUpperCase();
  const pageId=PAGE_SHORTCUTS[code];
  if(!pageId)return;
  event.preventDefault();
  if(openPageById(pageId)){
    input.value="";
    filterCurrentPage();
  }
}
const PERMISSION_ALIASES={
  customer_view:["corporate_customers_view"],customer_import:["corporate_customers_add","corporate_customers_edit"],customer_delete:["corporate_customers_delete"],
  duplicate_view:["documents_data_view"],duplicate_delete:["documents_data_delete"],
  vendor_view:["vendor_management_view"],vendor_add:["vendor_management_add"],vendor_edit:["vendor_management_edit"],vendor_delete:["vendor_management_delete"],
  ledger_view:["vendor_management_view","corporate_customers_view"],ledger_add:["vendor_management_add","corporate_customers_add"],ledger_delete:["vendor_management_delete","corporate_customers_delete"],
  cash_view:["head_cash_view","petty_cash_view","lost_found_view","theft_view"],cash_import:["head_cash_add","petty_cash_add","lost_found_add","theft_add"],cash_delete:["head_cash_delete","petty_cash_delete","lost_found_delete","theft_delete"],
  cashier_view:["cashier_closing_view"],cashier_import:["cashier_closing_add","cashier_closing_edit"],cashier_delete:["cashier_closing_delete"],
  return_view:["return_counter_view"],return_import:["return_counter_add","return_counter_edit"],return_delete:["return_counter_delete"],
  export_data:["documents_data_export","reports_export"],backup_restore:["documents_data_edit"],
  user_manage:["security_users_view","security_users_add","security_users_edit","security_users_delete"],audit_view:["reports_view"]
};
function can(p){
  if(!currentUser)return false;
  const perms=currentUser.permissions||[];
  return perms.includes(p)||(PERMISSION_ALIASES[p]||[]).some(x=>perms.includes(x));
}
function applyPermissions(){document.querySelectorAll("[data-permission]").forEach(el=>el.classList.toggle("hidden",!can(el.dataset.permission)));}
const $=id=>document.getElementById(id);const money=n=>"Rs. "+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});async function api(url,opt={}){const r=await fetch(url,opt);const j=await r.json();if(!r.ok)throw new Error(j.error||"Request failed");return j}async function login(){try{const r=await api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("loginUser").value,password:$("loginPass").value})});if(r.ok){$("loginPass").value="";$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");await init()}else $("loginMsg").textContent="Incorrect username or password"}catch(e){$("loginMsg").textContent=e.message}}async function logout(){await api("/api/logout",{method:"POST"});location.reload()}document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active");if($("pageTitle"))$("pageTitle").textContent=b.textContent});async function init(){currentUser=await api("/api/me");applyPermissions();await loadStores();if($("welcomeUser"))$("welcomeUser").textContent=`Welcome ${currentUser.full_name} — ${currentUser.role_name}`;const jobs=[loadNetwork()];if(can("dashboard_view"))jobs.push(loadDashboard());if(can("customer_view"))jobs.push(loadCustomers(),loadCorporate());if(can("duplicate_view"))jobs.push(loadDuplicates());if(can("vendor_view"))jobs.push(loadVendors());if(can("ledger_view"))jobs.push(loadVendorLedger());if(can("cash_view"))jobs.push(loadCash("Head Cash"),loadCash("Petty Cash"),loadDeletedCash(),loadSpecialCash("lostFound","lost_found"),loadSpecialCash("theftCash","theft"));if(can("cashier_view"))jobs.push(loadCashierDashboard(),loadCashierClosing(),loadCashierShortage(),loadCashierNotes(),loadCashierEmployees());if(can("user_manage"))jobs.push(loadUsers());if(can("audit_view"))jobs.push(loadAudit(),loadExceptions(),loadAging());if(can("return_view"))jobs.push(loadReturnApprovers(),loadReturnEntries());await Promise.all(jobs);if($("txDate"))$("txDate").value=new Date().toISOString().slice(0,10);if($("corpEntryDate"))$("corpEntryDate").value=new Date().toISOString().slice(0,10);renderPermissionGrid();setupBulkEntry()}async function loadStores(){
 const d=await api("/api/stores");
 const active=d.stores.find(s=>s.code===d.active_store)||d.stores[0];
 const list=$("storeListChildren");
 if(list){
   list.innerHTML=d.stores.map(s=>`<button type="button" class="store-select-leaf ${s.code===d.active_store?'active-store':''}" onclick="changeActiveStore('${esc(s.code)}')"><span>▣</span><em>${esc(s.code)}</em> ${esc(s.name)}</button>`).join("");
   list.hidden=false;
 }
 if(active && $("activeStoreFolderTitle")) $("activeStoreFolderTitle").textContent=`📁 ${active.code} - ${active.name}`;
}
async function reloadActiveStoreData(){
 const jobs=[];
 if(can("dashboard_view"))jobs.push(loadDashboard());
 if(can("customer_view"))jobs.push(loadCustomers(),loadCorporate());
 if(can("duplicate_view"))jobs.push(loadDuplicates());
 if(can("vendor_view"))jobs.push(loadVendors());
 if(can("ledger_view"))jobs.push(loadVendorLedger());
 if(can("cash_view"))jobs.push(loadCash("Head Cash"),loadCash("Petty Cash"),loadDeletedCash(),loadSpecialCash("lostFound","lost_found"),loadSpecialCash("theftCash","theft"));
 if(can("cashier_view"))jobs.push(loadCashierDashboard(),loadCashierClosing(),loadCashierShortage(),loadCashierNotes(),loadCashierEmployees());
 if(can("return_view"))jobs.push(loadReturnApprovers(),loadReturnEntries());
 await Promise.all(jobs);
}
async function changeActiveStore(code){
 try{
   await api("/api/active-store",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({store_code:code})});
   await loadStores();
   await reloadActiveStoreData();
   const dashboardNav=document.querySelector('.nav[data-page="dashboard"]');
   if(dashboardNav)dashboardNav.click();
 }catch(e){alert(e.message||"Store change failed");}
}
async function loadDashboard(){await loadStores();const d=await api("/api/dashboard");if($("dashboardStoreCode"))$("dashboardStoreCode").textContent=d.store_code||"";if($("dashboardStoreName"))$("dashboardStoreName").textContent=d.store_name||"";}async function loadCustomers(){const rows=await api("/api/customers");window.customerRows=rows;const options='<option value="">All Customers</option>'+rows.map(r=>`<option value="${r.code}">${r.code} - ${r.name}</option>`).join("");$("corpCustomer").innerHTML=options;if($("corpCustomerCodes"))$("corpCustomerCodes").innerHTML=rows.map(r=>`<option value="${esc(r.code)}">${esc(r.name)}</option>`).join("")}
async function updateLedgerSummary(prefix,module,params={}){
 const p=new URLSearchParams({module,...params});
 const d=await api('/api/ledger-summary?'+p);
 const set=(id,val)=>{const el=$(id);if(el)el.textContent=money(val)};
 set(prefix+'TotalDebit',d.debit);set(prefix+'TotalCredit',d.credit);set(prefix+'TotalBalance',d.balance);
}
function resolveCorporateEntryName(){const code=$("corpEntryCode")?.value.trim()||"";const row=(window.customerRows||[]).find(r=>String(r.code)===code);if($("corpEntryName"))$("corpEntryName").value=row?row.name:"";updateCorporateEntryBalance()}
function updateCorporateEntryBalance(){const d=Number($("corpEntryDebit")?.value||0),c=Number($("corpEntryCredit")?.value||0);if($("corpEntryBalance"))$("corpEntryBalance").value=money(d-c)}
function clearCorporateEntry(){["corpEntryDoc","corpEntryCode","corpEntryName","corpEntryDescription","corpEntryDebit","corpEntryCredit"].forEach(id=>{if($(id))$(id).value=""});if($("corpEntryDate"))$("corpEntryDate").value=new Date().toISOString().slice(0,10);updateCorporateEntryBalance()}
async function saveCorporateEntry(){const entry={document_number:$("corpEntryDoc").value.trim(),date:$("corpEntryDate").value,code:$("corpEntryCode").value.trim(),name:$("corpEntryName").value.trim(),description:$("corpEntryDescription").value.trim(),debit:$("corpEntryDebit").value||0,credit:$("corpEntryCredit").value||0};if(!entry.document_number)return alert("Document No. required.");if(!entry.date)return alert("Date required.");if(!entry.code||!entry.name)return alert("Valid Customer Code required.");const r=await api("/api/customer-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries:[entry]})});if(r.inserted){alert("Corporate Customer entry saved successfully.");clearCorporateEntry();await Promise.all([loadCorporate(),loadDashboard(),loadDuplicates()])}else alert((r.skipped&&r.skipped[0]&&r.skipped[0].reason)||"Entry save nahi hui.")}

async function loadCorporate(){
 const p=new URLSearchParams({q:$("corpSearch").value,code:$("corpCustomer").value,from:$("corpFrom").value,to:$("corpTo").value});
 const rows=await api("/api/customer-ledger?"+p);
 await updateLedgerSummary("corp","corporate",{q:$("corpSearch").value,code:$("corpCustomer").value,from:$("corpFrom").value,to:$("corpTo").value});
 let balances={};
 $("corpBody").innerHTML=rows.map(r=>{
   const code=r.customer_code||"";
   balances[code]=(balances[code]||0)+Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="corpRow" type="checkbox" value="${r.id}"></td>
   <td>${r.document_number||""}</td><td>${r.customer_code||""}</td><td>${r.customer_name||""}</td>
   <td>${r.posting_date||""}</td><td>${r.text||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balances[code])}</td></tr>`;
 }).join("")||'<tr><td colspan="9">No records found</td></tr>';
}
async function loadDuplicates(){
 const rows=await api("/api/duplicates?q="+encodeURIComponent($("dupSearch").value));
 await updateLedgerSummary("dup","duplicates",{q:$("dupSearch").value});
 let balance=0;
 $("dupBody").innerHTML=rows.map(r=>{
   balance+=Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="dupRow" type="checkbox" value="${r.id}"></td>
   <td>${r.document_number||""}</td><td>${r.posting_date||""}</td><td>${r.text||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balance)}</td><td>${r.duplicate_occurrences}</td></tr>`;
 }).join("")||'<tr><td colspan="8">No duplicate records</td></tr>';
}
$("corpUpload").onchange=async e=>{const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append("file",f);const r=await api("/api/import-corporate",{method:"POST",body:fd});alert(`New: ${r.imported}, Updated: ${r.updated||0}, Duplicate rows: ${r.duplicate_rows}, Non-customer rows skipped: ${r.skipped_non_customer_rows||0}`);await Promise.all([loadDashboard(),loadCorporate(),loadDuplicates()]);e.target.value=""};function downloadExport(m){location.href="/api/export/"+m}function downloadPdf(m){location.href="/api/pdf/"+m}async function loadVendors(){const rows=await api("/api/vendors");window.vendorRows=rows;$("vendorBody").innerHTML=rows.map(r=>`<tr><td>${r.vendor_code}</td><td>${r.vendor_name}</td><td>${money(r.security_deposit)}</td><td>${money(r.advance)}</td><td>${r.phone||""}</td><td>${r.status}</td><td>${can("vendor_edit")?`<button onclick="editVendor(${r.id})">Edit</button>`:""} ${can("vendor_delete")?`<button class="danger" onclick="deleteVendor(${r.id})">Delete</button>`:""}</td></tr>`).join("")||'<tr><td colspan="7">No vendors yet</td></tr>';const options='<option value="">Select Vendor</option>'+rows.filter(r=>r.status!=="Inactive").map(r=>`<option value="${r.vendor_code}|${r.vendor_name}">${r.vendor_code} - ${r.vendor_name}</option>`).join("");$("txVendor").innerHTML=options;$("ledgerVendor").innerHTML='<option value="">All Vendors</option>'+options.replace('<option value="">Select Vendor</option>','')}
function vendorPayload(){return {vendor_code:$("vCode").value.trim(),vendor_name:$("vName").value.trim(),security_deposit:$("vSecurity").value,advance:$("vAdvance").value,phone:$("vPhone").value,description:$("vDesc").value,status:$("vStatus").value}}
async function saveVendor(){if(!$("vCode").value.trim()||!$("vName").value.trim())return alert("Vendor code and name are required.");const url=editingVendorId?"/api/vendors/"+editingVendorId:"/api/vendors";await api(url,{method:editingVendorId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(vendorPayload())});cancelVendorEdit();await Promise.all([loadVendors(),loadDashboard()])}
function editVendor(id){const r=window.vendorRows.find(x=>x.id===id);if(!r)return;editingVendorId=id;$("vCode").value=r.vendor_code;$("vName").value=r.vendor_name;$("vSecurity").value=r.security_deposit;$("vAdvance").value=r.advance;$("vPhone").value=r.phone||"";$("vDesc").value=r.description||"";$("vStatus").value=r.status;$("vendorSaveBtn").textContent="Update Vendor";$("vendorCancelBtn").classList.remove("hidden")}
function cancelVendorEdit(){editingVendorId=null;["vCode","vName","vSecurity","vAdvance","vPhone","vDesc"].forEach(id=>$(id).value="");$("vStatus").value="Active";$("vendorSaveBtn").textContent="Save Vendor";$("vendorCancelBtn").classList.add("hidden")}
async function deleteVendor(id){if(!confirm("Delete this vendor? If ledger entries exist, vendor will be marked Inactive to protect history."))return;const r=await api("/api/vendors/"+id,{method:"DELETE"});alert(r.mode==="inactivated"?"Vendor has ledger entries, so it was marked Inactive.":"Vendor deleted successfully.");await Promise.all([loadVendors(),loadDashboard()])}async function addVendorTx(){const [code,name]=($("txVendor").value||"|").split("|");if(!code)return alert("Select vendor");await api("/api/vendor-ledger",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendor_code:code,vendor_name:name,tx_date:$("txDate").value,tx_type:$("txType").value,description:$("txDesc").value,debit:$("txDebit").value,credit:$("txCredit").value,payment_status:$("txStatus").value})});["txDesc","txDebit","txCredit"].forEach(id=>$(id).value="");await Promise.all([loadVendorLedger(),loadDashboard()])}async function loadVendorLedger(){
 const code=($("ledgerVendor").value||"|").split("|")[0];
 const rows=await api("/api/vendor-ledger?code="+encodeURIComponent(code)+"&q="+encodeURIComponent($("vendorSearch").value));
 await updateLedgerSummary("vendorLedger","vendor",{code,q:$("vendorSearch").value});
 let balances={};
 $("vendorLedgerBody").innerHTML=rows.map(r=>{
   const vc=r.vendor_code||"";
   balances[vc]=(balances[vc]||0)+Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="vendorLedgerRow" type="checkbox" value="${r.id}"></td>
   <td>${r.tx_date||""}</td><td>${r.vendor_code} - ${r.vendor_name}</td><td>${r.document_number||""}</td><td>${r.description||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balances[vc])}</td><td>${r.payment_status}</td></tr>`;
 }).join("")||'<tr><td colspan="9">No vendor entries</td></tr>';
}
async function deleteVendorTx(id){if(!confirm("Delete entry?"))return;await api("/api/vendor-ledger/"+id,{method:"DELETE"});await Promise.all([loadVendorLedger(),loadDashboard()])}$("ledgerVendor").onchange=loadVendorLedger;
function toggleAll(className,checked){document.querySelectorAll("."+className).forEach(x=>x.checked=checked)}
function selectedIds(className){return [...document.querySelectorAll("."+className+":checked")].map(x=>Number(x.value))}
async function deleteSelectedCorporate(){
 const ids=selectedIds("corpRow");if(!ids.length)return alert("Please select records.");
 if(!confirm(`Delete ${ids.length} selected customer ledger records?`))return;
 await api("/api/customer-ledger/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadCorporate(),loadDashboard()]);
}
async function deleteAllCorporate(){
 if(!confirm("Delete ALL corporate ledger records? This cannot be undone."))return;
 await api("/api/customer-ledger/delete-all",{method:"DELETE"});await Promise.all([loadCorporate(),loadDashboard()]);
}
async function deleteSelectedDuplicates(){
 const ids=selectedIds("dupRow");if(!ids.length)return alert("Please select duplicate records.");
 if(!confirm(`Delete ${ids.length} selected duplicate rows?`))return;
 await api("/api/duplicates/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadDuplicates(),loadDashboard()]);
}
async function deleteAllDuplicates(){
 if(!confirm("Delete ALL duplicate document records?"))return;
 await api("/api/duplicates/delete-all",{method:"DELETE"});await Promise.all([loadDuplicates(),loadDashboard()]);
}
async function deleteSelectedVendorLedger(){
 const ids=selectedIds("vendorLedgerRow");if(!ids.length)return alert("Please select vendor ledger records.");
 if(!confirm(`Delete ${ids.length} selected vendor ledger records?`))return;
 await api("/api/vendor-ledger/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadVendorLedger(),loadDashboard()]);
}
async function deleteAllVendorLedger(){
 if(!confirm("Delete ALL vendor ledger records?"))return;
 await api("/api/vendor-ledger/delete-all",{method:"DELETE"});await Promise.all([loadVendorLedger(),loadDashboard()]);
}
$("restoreFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!confirm("Restore this backup? Current data will be saved automatically before restore.")){e.target.value="";return}const fd=new FormData();fd.append("file",f);const r=await api("/api/restore",{method:"POST",body:fd});alert(r.message||"Backup restored successfully.");location.reload();};
async function loadNetwork(){const r=await api("/api/network");$("mobileUrl").textContent=r.url}
async function loadBackupStatus(){if(!$("backupStatus"))return;try{const r=await api("/api/backup-status");$("backupStatus").innerHTML=`<b>Permanent Database:</b> ${esc(r.database_location)}<br><b>Latest Backup:</b> ${esc(r.latest_backup)} ${r.latest_backup_time?`(${esc(r.latest_backup_time)})`:""}<br><b>Total Saved Backups:</b> ${r.backup_count}`;}catch(e){$("backupStatus").textContent="Backup status is available to authorized users only."}}
function renderPermissionGrid(){if(!$("permissionGrid"))return;const names={dashboard:"Dashboard",corporate_customers:"Corporate Customers",vendor_management:"Vendor Management",head_cash:"Head Cash",petty_cash:"Petty Cash",cashier_closing:"Cashier Closing",return_counter:"Return Counter",lost_found:"Lost & Found",theft:"Theft",documents_data:"Documents & Data",reports:"Reports",security_users:"Security & Users"};$("permissionGrid").innerHTML=`<div class="rights-table"><div class="rights-row rights-head"><b>Module</b>${RIGHTS_ACTIONS.map(a=>`<b>${a[0].toUpperCase()+a.slice(1)}</b>`).join("")}</div>${RIGHTS_MODULES.map(m=>`<div class="rights-row"><strong>${names[m]}</strong>${RIGHTS_ACTIONS.map(a=>`<label title="${names[m]} - ${a}"><input type="checkbox" class="permCheck" value="${m}_${a}"></label>`).join("")}</div>`).join("")}</div>`}
function userPayload(){return {full_name:$("uFullName").value.trim(),username:$("uUsername").value.trim(),password:$("uPassword").value,role_name:$("uRole").value,user_type:$("uType").value,store_access:$("uStore").value.trim()||"ALL",status:$("uStatus").value,permissions:[...document.querySelectorAll(".permCheck:checked")].map(x=>x.value)}}
function formatLoginTime(v){if(!v)return "Never Logged In";const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):d.toLocaleString(undefined,{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
async function loadUsers(){const rows=await api("/api/users");window.userRows=rows;$("usersBody").innerHTML=rows.map(r=>`<tr><td><b>${esc(r.full_name)}</b></td><td>${esc(r.username)}</td><td>${esc(r.role_name)}</td><td>${esc(r.user_type)}</td><td>${esc(r.store_access)}</td><td>${esc(r.status)}</td><td><span class="login-time">${formatLoginTime(r.last_login)}</span></td><td><button onclick="editUser(${r.id})">Manage Rights</button> <button class="secondary" disabled title="Users cannot be deleted; block the user instead">Permanent</button></td></tr>`).join("")}
async function saveUser(){const d=userPayload();if(!d.full_name||!d.username||(!editingUserId&&!d.password))return alert("Full name, username and password are required.");await api(editingUserId?"/api/users/"+editingUserId:"/api/users",{method:editingUserId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});cancelUserEdit();await loadUsers();await loadAudit()}
function editUser(id){document.getElementById("permissionGrid")?.scrollIntoView({behavior:"smooth",block:"center"});const r=window.userRows.find(x=>x.id===id);editingUserId=id;$("uFullName").value=r.full_name;$("uUsername").value=r.username;$("uPassword").value="";$("uRole").value=r.role_name;$("uType").value=r.user_type;$("uStore").value=r.store_access;$("uStatus").value=r.status;document.querySelectorAll(".permCheck").forEach(x=>x.checked=r.permissions.includes(x.value));$("userSaveBtn").textContent="Update User";$("userCancelBtn").classList.remove("hidden")}
function cancelUserEdit(){editingUserId=null;["uFullName","uUsername","uPassword"].forEach(id=>$(id).value="");$("uStore").value="ALL";$("uRole").value="Master Account";$("uType").value="Local";$("uStatus").value="Active";document.querySelectorAll(".permCheck").forEach(x=>x.checked=false);$("userSaveBtn").textContent="Create User";$("userCancelBtn").classList.add("hidden")}
async function deleteUser(id){alert("User auto-delete permanently disabled hai. User ko remove karne ke bajaye Status = Blocked karein.");}
async function loadAudit(){const rows=await api("/api/audit-log");$("auditBody").innerHTML=rows.map(r=>`<tr><td>${r.created_at}</td><td>${r.username}</td><td>${r.action}</td><td>${r.module}</td><td>${r.details||""}</td><td>${r.ip_address||""}</td></tr>`).join("")||'<tr><td colspan="6">No activity yet</td></tr>'}


// Unlimited bulk entry grids (supports direct Excel tab-separated paste)
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function bulkRow(type,data={}){
 const tr=document.createElement("tr");tr.className="bulk-input-row";tr.dataset.type=type;
 tr.innerHTML=type==="corp"?`<td class="bulk-index"></td>
 <td><input class="b-doc" value="${esc(data.document_number||"")}" placeholder="Document No."></td>
 <td><input class="b-code" value="${esc(data.code||"")}" placeholder="Customer Code"></td>
 <td><input class="b-name" value="${esc(data.name||"")}" placeholder="Customer Name" readonly></td>
 <td><input class="b-date" type="date" value="${esc(normalizeCorporateDate(data.date)||new Date().toISOString().slice(0,10))}"></td>
 <td><input class="b-desc" value="${esc(data.description||"")}" placeholder="Description"></td>
 <td><input class="b-debit" type="number" step="0.01" value="${esc(data.debit||"")}" placeholder="0.00"></td>
 <td><input class="b-credit" type="number" step="0.01" value="${esc(data.credit||"")}" placeholder="0.00"></td>
 <td class="b-balance">${money(0)}</td><td><button class="danger" onclick="this.closest('tr').remove();refreshBulk('${type}')">×</button></td>`:`<td class="bulk-index"></td><td><input class="b-code" value="${esc(data.code||"")}" placeholder="Code"></td>
 <td><input class="b-name" value="${esc(data.name||"")}" placeholder="Name"></td>
 <td><input class="b-doc" value="${esc(data.document_number||"")}" placeholder="Document No."></td><td><input class="b-date" type="date" value="${esc(data.date||new Date().toISOString().slice(0,10))}"></td>
 <td><input class="b-desc" value="${esc(data.description||"")}" placeholder="Description"></td>
 <td><input class="b-debit" type="number" step="0.01" value="${esc(data.debit||"")}" placeholder="0.00"></td>
 <td><input class="b-credit" type="number" step="0.01" value="${esc(data.credit||"")}" placeholder="0.00"></td>
 <td class="b-balance">${money(0)}</td><td><button class="danger" onclick="this.closest('tr').remove();refreshBulk('${type}')">×</button></td>`;
 tr.querySelectorAll("input").forEach(x=>x.addEventListener("input",()=>{if(x.classList.contains("b-code"))resolveBulkName(tr,type);refreshBulk(type)}));
 return tr;
}
function addBulkRows(bodyId,count,type,dataRows=[]){const body=$(bodyId);const rows=dataRows.length?dataRows:Array.from({length:count},()=>({}));rows.forEach(r=>body.appendChild(bulkRow(type,r)));refreshBulk(type)}
function resolveBulkName(tr,type){const code=tr.querySelector(".b-code").value.trim();if(type==="corp"){const opt=[...$("corpCustomer").options].find(o=>o.value===code);tr.querySelector(".b-name").value=opt?opt.textContent.split(" - ").slice(1).join(" - "):""}else{const r=(window.vendorRows||[]).find(v=>String(v.vendor_code)===code);if(r)tr.querySelector(".b-name").value=r.vendor_name}}
function refreshBulk(type){const body=$(type==="corp"?"corpBulkBody":"vendorBulkBody");let balances={};let ready=0;[...body.rows].forEach((tr,i)=>{tr.querySelector(".bulk-index").textContent=i+1;resolveBulkName(tr,type);const code=tr.querySelector(".b-code").value.trim();const d=Number(tr.querySelector(".b-debit").value||0),c=Number(tr.querySelector(".b-credit").value||0);const hasData=type==="corp"?tr.querySelector(".b-doc").value.trim():(tr.querySelector(".b-desc").value.trim()||tr.querySelector(".b-doc")?.value.trim());if(code&&(hasData||d||c))ready++;balances[code]=(balances[code]||0)+d-c;tr.querySelector(".b-balance").textContent=money(balances[code])});$(type==="corp"?"corpBulkCount":"vendorBulkCount").textContent=`${ready} ready rows`}
function clearBulk(bodyId,type){if(confirm("Clear all entered rows?")){ $(bodyId).innerHTML="";addBulkRows(bodyId,5,type)}}
function normalizeCorporateDate(value){const v=String(value||"").trim();if(!v)return "";if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const m=v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);if(m){let y=m[3];if(y.length===2)y="20"+y;return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`}const d=new Date(v);return isNaN(d)?"":d.toISOString().slice(0,10)}
function parseBulkPaste(text,type="corp"){return text.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const c=line.split("\t");if(type==="vendor")return {code:(c[0]||"").trim(),name:(c[1]||"").trim(),document_number:(c[2]||"").trim(),date:(c[3]||"").trim(),description:(c[4]||"").trim(),debit:(c[5]||"").replaceAll(",",""),credit:(c[6]||"").replaceAll(",","")};return {document_number:(c[0]||"").trim(),code:(c[1]||"").trim(),name:(c[2]||"").trim(),date:normalizeCorporateDate(c[3]),description:(c[4]||"").trim(),debit:(c[5]||"").replaceAll(",",""),credit:(c[6]||"").replaceAll(",","")}})}
function bulkPayload(type){const body=$(type==="corp"?"corpBulkBody":"vendorBulkBody");return [...body.rows].map(tr=>({code:tr.querySelector(".b-code").value.trim(),name:tr.querySelector(".b-name").value.trim(),document_number:tr.querySelector(".b-doc")?.value.trim()||"",description:tr.querySelector(".b-desc")?.value.trim()||"",debit:tr.querySelector(".b-debit").value,credit:tr.querySelector(".b-credit").value,date:tr.querySelector(".b-date")?.value||new Date().toISOString().slice(0,10)})).filter(r=>r.code&&(r.document_number||r.description||Number(r.debit)||Number(r.credit)))}
async function saveCorporateBulk(){const entries=bulkPayload("corp");if(!entries.length)return alert("Please enter at least one corporate entry.");const r=await api("/api/customer-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries})});alert(`Saved: ${r.inserted}. Duplicate rows: ${r.duplicate_rows||0}. Skipped: ${r.skipped.length}`);if(r.inserted||r.duplicate_rows){$("corpBulkBody").innerHTML="";addBulkRows("corpBulkBody",5,"corp")}await Promise.all([loadCorporate(),loadDuplicates(),loadDashboard()])}
async function saveCorporatePaste(){const text=$("corpPaste").value.trim();if(!text)return alert("Excel data paste karein.");const entries=parseBulkPaste(text,"corp");if(!entries.length)return alert("No valid pasted rows found.");let inserted=0,duplicates=0,skipped=0;const chunkSize=2000;$("corpPasteStatus").textContent=`Processing ${entries.length} rows...`;for(let i=0;i<entries.length;i+=chunkSize){const chunk=entries.slice(i,i+chunkSize);const r=await api("/api/customer-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries:chunk})});inserted+=r.inserted||0;duplicates+=r.duplicate_rows||0;skipped+=(r.skipped||[]).length;$("corpPasteStatus").textContent=`Processed ${Math.min(i+chunkSize,entries.length)} / ${entries.length} rows...`}$("corpPasteStatus").textContent=`Saved ${inserted}; duplicates ${duplicates}; skipped ${skipped}.`;$("corpPaste").value="";await Promise.all([loadCorporate(),loadDuplicates(),loadDashboard()]);alert(`Completed. Saved: ${inserted}. Duplicate rows: ${duplicates}. Skipped: ${skipped}.`)}
function clearCorporatePaste(){$("corpPaste").value="";$("corpPasteStatus").textContent="Paste ki hui rows direct save hongi; bari files chunks mein automatically process hongi.";clearBulk("corpBulkBody","corp")}
async function saveVendorBulk(){const entries=bulkPayload("vendor");if(!entries.length)return alert("Please enter at least one vendor entry.");const r=await api("/api/vendor-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries})});alert(`Saved: ${r.inserted}. Skipped: ${r.skipped.length}`);if(r.inserted){$("vendorBulkBody").innerHTML="";addBulkRows("vendorBulkBody",5,"vendor")}await Promise.all([loadVendors(),loadVendorLedger(),loadDashboard()])}
async function uploadVendorLargeFile(){const f=$("vendorLargeFile").files[0];if(!f)return alert("Please select Excel or CSV file.");if(!confirm(`Import ${f.name}? Maximum 50,000 data rows will be posted.`))return;const fd=new FormData();fd.append("file",f);$("vendorImportStatus").textContent="Importing... please wait";try{const r=await api("/api/vendor-ledger/import-large",{method:"POST",body:fd});$("vendorImportStatus").textContent=`Imported ${r.inserted}; skipped ${r.skipped}`;alert(`Vendor import completed. Imported: ${r.inserted}. Skipped: ${r.skipped}.`);$("vendorLargeFile").value="";await Promise.all([loadVendors(),loadVendorLedger(),loadDashboard()])}catch(e){$("vendorImportStatus").textContent=e.message;alert(e.message)}}
function setupBulkEntry(){if($("corpBulkBody")&&!$("corpBulkBody").rows.length)addBulkRows("corpBulkBody",5,"corp");if($("vendorBulkBody")&&!$("vendorBulkBody").rows.length)addBulkRows("vendorBulkBody",5,"vendor");const vendorPaste=$("vendorPaste");if(vendorPaste)vendorPaste.addEventListener("paste",e=>{e.preventDefault();const rows=parseBulkPaste(e.clipboardData.getData("text"),"vendor");if(rows.length){$("vendorBulkBody").innerHTML="";addBulkRows("vendorBulkBody",0,"vendor",rows);vendorPaste.value=""}})}


function cashIds(type){return type==="Head Cash"?{body:"headCashBody",search:"headCashSearch",from:"headCashFrom",to:"headCashTo",row:"headCashRow",upload:"headCashUpload"}:{body:"pettyCashBody",search:"pettyCashSearch",from:"pettyCashFrom",to:"pettyCashTo",row:"pettyCashRow",upload:"pettyCashUpload"}}
function cashLimit(type){return type==='Head Cash'?5700000:900000}function limitState(balance,limit){const b=Math.round(Number(balance)*100)/100;const l=Math.round(Number(limit)*100)/100;if(b===l)return {text:'LIMIT MATCH',cls:'limit-match'};if(b>l)return {text:'LIMIT EXCEEDED',cls:'limit-exceeded'};return {text:'BELOW LIMIT',cls:'limit-below'}}async function loadCash(type){const x=cashIds(type);if(!$(x.body))return;const p=new URLSearchParams({type,q:$(x.search).value,from:$(x.from).value,to:$(x.to).value});const rows=await api('/api/cash-ledger?'+p);await updateLedgerSummary(type==='Head Cash'?'headCash':'pettyCash',type,{q:$(x.search).value,from:$(x.from).value,to:$(x.to).value});let bal=0,limit=cashLimit(type);$(x.body).innerHTML=rows.map(r=>{bal+=type==='Head Cash'?(Number(r.credit||0)-Number(r.debit||0)):(Number(r.debit||0)-Number(r.credit||0));const st=limitState(bal,limit);return `<tr><td><input class="${x.row}" type="checkbox" value="${r.id}"></td><td>${esc(r.document_number)}</td><td>${esc(r.document_date)}</td><td>${esc(r.posting_date)}</td><td>${esc(r.description)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(bal)}</td><td><span class="limit-status ${st.cls}">${st.text}</span></td></tr>`}).join('')||'<tr><td colspan="9">No records found</td></tr>';const overall=limitState(bal,limit),el=$(type==='Head Cash'?'headCashOverallStatus':'pettyCashOverallStatus');if(el){el.textContent=overall.text;el.className=overall.cls}notifyCashLimit(type,bal,limit,overall)}
async function loadDeletedCash(){if(!$('deletedCashBody'))return;const rows=await api('/api/deleted-cash?q='+encodeURIComponent($('deletedCashSearch').value));await updateLedgerSummary('deletedCash','Deleted Entries',{q:$('deletedCashSearch').value});$('deletedCashBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.cash_type)}</td><td>${esc(r.document_number)}</td><td>${esc(r.document_date)}</td><td>${esc(r.posting_date)}</td><td>${esc(r.description)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${esc(r.deleted_by)}</td><td>${esc(r.deleted_at)}</td><td><button onclick="restoreCash(${r.id})">Restore</button></td></tr>`).join('')||'<tr><td colspan="10">No deleted entries</td></tr>'}
async function deleteSelectedCash(type){const x=cashIds(type),ids=selectedIds(x.row);if(!ids.length)return alert('Please select records.');if(!confirm(`Delete ${ids.length} selected ${type} entries? They will move to Deleted Entries.`))return;await api('/api/cash-ledger/delete-selected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});await Promise.all([loadCash(type),loadDeletedCash(),loadDashboard()])}
async function restoreCash(id){await api('/api/deleted-cash/restore/'+id,{method:'POST'});await Promise.all([loadCash('Head Cash'),loadCash('Petty Cash'),loadDeletedCash(),loadDashboard()])}
async function showCashEntry(type){const document_number=prompt('Document No.');if(document_number===null)return;const document_date=prompt('Document Date (YYYY-MM-DD)',new Date().toISOString().slice(0,10));const posting_date=prompt('Posting Date (YYYY-MM-DD)',document_date||'');const description=prompt('Description','')||'';const debit=prompt('Debit Amount','0')||0;const credit=prompt('Credit Amount','0')||0;await api('/api/cash-ledger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cash_type:type,document_number,document_date,posting_date,description,debit,credit})});await Promise.all([loadCash(type),loadDashboard()])}
async function uploadCash(type){const x=cashIds(type),f=$(x.upload).files[0];if(!f)return;const fd=new FormData();fd.append('file',f);fd.append('cash_type',type);const r=await api('/api/cash-ledger/import',{method:'POST',body:fd});alert(`Imported ${r.inserted} ${type} entries.`);$(x.upload).value='';await Promise.all([loadCash(type),loadDashboard()])}
if($('headCashUpload'))$('headCashUpload').onchange=()=>uploadCash('Head Cash');if($('pettyCashUpload'))$('pettyCashUpload').onchange=()=>uploadCash('Petty Cash');

function specialRange(prefix){
 const period=$(prefix+'Period')?.value||'all'; let from='',to='';
 if(period==='day'){from=to=$(prefix+'Date')?.value||''}
 else if(period==='week'){const v=$(prefix+'Week')?.value||'';if(v){const [y,w]=v.split('-W').map(Number),d=new Date(Date.UTC(y,0,4+(w-1)*7)),day=d.getUTCDay()||7,m=new Date(d);m.setUTCDate(d.getUTCDate()-day+1);const s=new Date(m),e=new Date(m);e.setUTCDate(s.getUTCDate()+6);from=s.toISOString().slice(0,10);to=e.toISOString().slice(0,10)}}
 else if(period==='month'){const v=$(prefix+'Month')?.value||'';if(v){from=v+'-01';const [y,m]=v.split('-').map(Number);to=new Date(y,m,0).toISOString().slice(0,10)}}
 else if(period==='custom'){from=$(prefix+'From')?.value||'';to=$(prefix+'To')?.value||''}
 return {from,to};
}
function specialPeriodChange(prefix){const p=$(prefix+'Period').value;['Date','Week','Month','From','To'].forEach(s=>{const el=$(prefix+s);if(el)el.style.display='none'});if(p==='day')$(prefix+'Date').style.display='';if(p==='week')$(prefix+'Week').style.display='';if(p==='month')$(prefix+'Month').style.display='';if(p==='custom'){$(prefix+'From').style.display='';$(prefix+'To').style.display=''};}
async function loadSpecialCash(prefix,category){if(!$(prefix+'Body'))return;specialPeriodChange(prefix);const r=specialRange(prefix),p=new URLSearchParams({category,q:$(prefix+'Search')?.value||'',from:r.from,to:r.to});const rows=await api('/api/special-cash?'+p);let debit=0,credit=0,bal=0;$(prefix+'Body').innerHTML=rows.map(x=>{debit+=Number(x.debit||0);credit+=Number(x.credit||0);bal+=Number(x.credit||0)-Number(x.debit||0);return `<tr><td>${esc(x.document_number)}</td><td>${esc(x.document_date)}</td><td>${esc(x.posting_date)}</td><td>${esc(x.description)}</td><td>${money(x.debit)}</td><td>${money(x.credit)}</td><td>${money(bal)}</td></tr>`}).join('')||'<tr><td colspan="7">No matching entries found</td></tr>';$(prefix+'Debit').textContent=money(debit);$(prefix+'Credit').textContent=money(credit);$(prefix+'Total').textContent=money(debit+credit);$(prefix+'Count').textContent=rows.length.toLocaleString();}
function resetSpecialCash(prefix,category){$(prefix+'Period').value='all';['Date','Week','Month','From','To','Search'].forEach(s=>{if($(prefix+s))$(prefix+s).value=''});loadSpecialCash(prefix,category)}



function filterCurrentPage(){const q=($('globalSearch')?.value||'').trim().toLowerCase();const page=document.querySelector('.page.active');if(!page)return;page.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=!q||tr.textContent.toLowerCase().includes(q)?'':'none'})}

function updateSapClock(){const n=new Date();const d=document.getElementById('sapDate'),t=document.getElementById('sapTime');if(d)d.textContent='Date: '+n.toLocaleDateString('en-GB');if(t)t.textContent='Time: '+n.toLocaleTimeString('en-GB');}setInterval(updateSapClock,1000);updateSapClock();

// V17 SAP menu actions and corrected navigation behavior
const SAP_MENU_ITEMS={
 menu:[['Dashboard','nav:dashboard'],['Corporate Customers','nav:corporate'],['Vendor Ledger','nav:vendorLedger'],['Head Cash','nav:headCash'],['Petty Cash','nav:pettyCash'],['Logout','logout']],
 edit:[['Search Current Page','focus-search'],['Select All Rows','select-all'],['Clear Search','clear-search']],
 favorites:[['Dashboard (DS)','shortcut:DS'],['Corporate Customers (CC)','shortcut:CC'],['Vendor Ledger (VL)','shortcut:VL'],['Head Cash (HC)','shortcut:HC'],['Petty Cash (PC)','shortcut:PC']],
 extras:[['Duplicate Documents','nav:duplicates'],['Deleted Entries','nav:deletedCash'],['Activity Log','nav:audit']],
 system:[['Users & Rights','nav:users'],['Settings & Backup','nav:settings'],['Refresh Data','refresh'],['System Information','system-info']],
 help:[['Shortcut Codes','shortcuts-help'],['About Software','about']]
};
function openSapMenu(key,anchor){
 const box=document.getElementById('sapMenuDropdown'); if(!box)return;
 document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.toggle('active',x===anchor));
 box.innerHTML=(SAP_MENU_ITEMS[key]||[]).map(([label,action])=>`<button type="button" data-action="${action}">${label}</button>`).join('');
 box.style.left=Math.max(8,anchor.offsetLeft)+'px'; box.classList.remove('hidden');
}
function runSapAction(action){
 const box=document.getElementById('sapMenuDropdown'); box?.classList.add('hidden'); document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.remove('active'));
 if(action.startsWith('nav:')){document.querySelector(`[data-page="${action.slice(4)}"]`)?.click();return}
 if(action.startsWith('shortcut:')){const el=document.getElementById('globalSearch');el.value=action.slice(9);handleGlobalShortcut({key:'Enter',preventDefault(){}});return}
 if(action==='focus-search'){document.getElementById('globalSearch')?.focus();return}
 if(action==='clear-search'){const el=document.getElementById('globalSearch');if(el){el.value='';filterCurrentPage()}return}
 if(action==='select-all'){document.querySelectorAll('.page.active tbody input[type="checkbox"]').forEach(x=>x.checked=true);return}
 if(action==='refresh'){location.reload();return}
 if(action==='logout'){logout();return}
 if(action==='system-info'){alert('Corporate Finance Management System\nUser: Rahat Ullah (20031)\nDatabase: Connected\nSAP S/4HANA Style Interface');return}
 if(action==='shortcuts-help'){alert('DS Dashboard\nCC Corporate Customers\nVL Vendor Ledger\nHC Head Cash\nPC Petty Cash\nDD Duplicate Documents\nSV Scrap Vendors\nDE Deleted Entries\nUR Users & Rights\nAL Activity Log\nSB Settings & Backup\nCD Cashier Closing Dashboard\nCL Cashier Closing Entry');return}
 if(action==='about'){alert('Imtiaz Group Pvt. Ltd.\nCorporate Finance Management System\nSAP Easy Access Style');return}
}
document.addEventListener('click',e=>{
 const mb=e.target.closest('.sap-menu-button'); if(mb){e.stopPropagation();openSapMenu(mb.dataset.menu,mb);return}
 const act=e.target.closest('#sapMenuDropdown [data-action]'); if(act){runSapAction(act.dataset.action);return}
 if(!e.target.closest('#sapMenuDropdown')){document.getElementById('sapMenuDropdown')?.classList.add('hidden');document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.remove('active'))}
});

// V18: drag the divider to adjust left navigation and workspace widths.
(function setupSapSidebarResize(){
  const resizer = document.getElementById('sidebarResizer');
  if (!resizer) return;
  let dragging = false;
  const setWidth = (clientX) => {
    const min = 235;
    const max = Math.min(520, window.innerWidth * 0.45);
    const width = Math.max(min, Math.min(max, clientX));
    document.documentElement.style.setProperty('--sap-sidebar-width', `${width}px`);
    try { localStorage.setItem('sapSidebarWidth', String(width)); } catch (_) {}
  };
  try {
    const saved = Number(localStorage.getItem('sapSidebarWidth'));
    if (saved >= 235 && saved <= 520) setWidth(saved);
  } catch (_) {}
  resizer.addEventListener('pointerdown', (event) => {
    dragging = true;
    resizer.classList.add('dragging');
    resizer.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  resizer.addEventListener('pointermove', (event) => {
    if (dragging) setWidth(event.clientX);
  });
  const stop = (event) => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    try { resizer.releasePointerCapture(event.pointerId); } catch (_) {}
  };
  resizer.addEventListener('pointerup', stop);
  resizer.addEventListener('pointercancel', stop);
})();

// V37: closed-by-default accordion navigation.
// Only the clicked folder opens; other folders at the same level close automatically.
(function setupFolderTreeNavigation(){
  const folders=[...document.querySelectorAll('.sap-folder')];
  const closeFolder=(folder)=>{
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    const children=folder.querySelector(':scope > .sap-folder-children');
    if(trigger) trigger.setAttribute('aria-expanded','false');
    if(children) children.hidden=true;
  };
  const closeSiblingFolders=(folder)=>{
    const parent=folder.parentElement;
    if(!parent) return;
    [...parent.children].forEach(item=>{
      if(item!==folder && item.classList?.contains('sap-folder')) closeFolder(item);
    });
  };
  const openFolder=(folder)=>{
    closeSiblingFolders(folder);
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    const children=folder.querySelector(':scope > .sap-folder-children');
    if(trigger) trigger.setAttribute('aria-expanded','true');
    if(children) children.hidden=false;
  };
  const openFolderPath=(folder)=>{
    const chain=[];
    let current=folder;
    while(current && current.classList?.contains('sap-folder')){
      chain.unshift(current);
      current=current.parentElement?.closest('.sap-folder');
    }
    chain.forEach(openFolder);
  };
  // Every store/module folder remains closed on login and refresh.
  folders.forEach(closeFolder);
  folders.forEach(folder=>{
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    trigger?.addEventListener('click',()=>{
      const expanded=trigger.getAttribute('aria-expanded')==='true';
      if(expanded) closeFolder(folder); else openFolder(folder);
    });
  });
  // Override legacy page handlers so missing old headings cannot interrupt navigation.
  document.querySelectorAll('.nav').forEach(btn=>{
    btn.onclick=()=>{
      const target=document.getElementById(btn.dataset.page);
      if(!target) return;
      document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
      target.classList.add('active');
      document.querySelector('.content')?.scrollTo({top:0,left:0,behavior:'auto'});
    };
  });
  // Shortcut navigation automatically expands the parent folder.
  const originalOpenPageById=window.openPageById;
  window.openPageById=function(pageId){
    const btn=[...document.querySelectorAll('.nav')].find(b=>b.dataset.page===pageId);
    if(!btn||btn.classList.contains('hidden')||btn.style.display==='none'){
      alert('You do not have permission to open this page.');
      return false;
    }
    const folder=btn.closest('.sap-folder');
    if(folder) openFolderPath(folder);
    btn.click();
    btn.scrollIntoView({block:'nearest'});
    return true;
  };
})();


// Cashier Closing Module
let cashierEmployees={};
const cashierCols=[
 ['closing_date','Date','date'],['employee_id','Emp ID','text'],['employee_name','Employee Name','text'],
 ['first_5000','1st 5000','number'],['first_1000','1st 1000','number'],['first_500','1st 500','number'],['first_total','1st Total','number'],
 ['second_5000','2nd 5000','number'],['second_1000','2nd 1000','number'],['second_500','2nd 500','number'],['second_total','2nd Total','number'],
 ['third_5000','3rd 5000','number'],['third_1000','3rd 1000','number'],['third_500','3rd 500','number'],['third_total','3rd Total','number'],
 ['fourth_5000','4th 5000','number'],['fourth_1000','4th 1000','number'],['fourth_500','4th 500','number'],['fourth_total','4th Total','number'],
 ['close_5000','Close 5000','number'],['close_1000','Close 1000','number'],['close_500','Close 500','number'],['close_100','Close 100','number'],['close_75','Close 75','number'],['close_50','Close 50','number'],['close_20','Close 20','number'],['close_10','Close 10','number'],['close_5','Close 5','number'],['close_2','Close 2','number'],['close_1','Close 1','number'],
 ['total_closing_cash','Total Closing Cash','number'],['system_total_sale','System Total Sale','number'],['collection_difference','Cash Difference','number'],['audit_status','Audit Status','text'],['remarks','Remarks','text'],['ivend_pos','iVend POS','number'],['settlement_bank','Settlement Bank','number'],['card_difference','Card Difference','number'],['card_status','Card Status','text'],['card_remarks','Card Remarks','text']
];
async function loadCashierEmployees(){try{const rows=await api('/api/cashier-employees');cashierEmployees=Object.fromEntries(rows.map(r=>[String(r.employee_id),r.employee_name]));}catch(e){}}
function buildCashierEntryGrid(){const head=$('cashierEntryHead'),body=$('cashierEntryBody');if(!head||!body)return;head.innerHTML='<tr><th>#</th>'+cashierCols.map(c=>`<th>${c[1]}</th>`).join('')+'</tr>';body.innerHTML='';for(let i=1;i<=50;i++){const tr=document.createElement('tr');tr.innerHTML=`<td>${i}</td>`+cashierCols.map(c=>`<td><input data-key="${c[0]}" type="${c[2]}" ${c[2]==='number'?'step="any" value="0"':''}></td>`).join('');const emp=tr.querySelector('[data-key="employee_id"]'),name=tr.querySelector('[data-key="employee_name"]');emp.addEventListener('change',()=>{if(cashierEmployees[emp.value])name.value=cashierEmployees[emp.value]});tr.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>calcCashierRow(tr)));body.appendChild(tr)}}
function calcCashierRow(tr){const v=k=>Number(tr.querySelector(`[data-key="${k}"]`)?.value||0),set=(k,n)=>{const e=tr.querySelector(`[data-key="${k}"]`);if(e)e.value=(Math.round(n*100)/100)};set('first_total',v('first_5000')*5000+v('first_1000')*1000+v('first_500')*500);set('second_total',v('second_5000')*5000+v('second_1000')*1000+v('second_500')*500);set('third_total',v('third_5000')*5000+v('third_1000')*1000+v('third_500')*500);set('fourth_total',v('fourth_5000')*5000+v('fourth_1000')*1000+v('fourth_500')*500);const close=v('close_5000')*5000+v('close_1000')*1000+v('close_500')*500+v('close_100')*100+v('close_75')*75+v('close_50')*50+v('close_20')*20+v('close_10')*10+v('close_5')*5+v('close_2')*2+v('close_1');set('total_closing_cash',close);const totalCash=v('first_total')+v('second_total')+v('third_total')+v('fourth_total')+close;const diff=totalCash-v('system_total_sale');set('collection_difference',diff);const status=diff<0?'Short':diff>0?'Excess':'Matched';tr.querySelector('[data-key="audit_status"]').value=status;const remarks=tr.querySelector('[data-key="remarks"]');if(remarks&&!remarks.dataset.userEdited)remarks.value=diff<0?`Cash shortage Rs. ${Math.abs(diff).toFixed(2)}`:diff>0?`Cash excess Rs. ${diff.toFixed(2)}`:'Cash matched';const cd=v('ivend_pos')-v('settlement_bank');set('card_difference',cd);const cardStatus=Math.abs(cd)<.01?'Matched':cd>0?'POS Excess':'POS Short';tr.querySelector('[data-key="card_status"]').value=cardStatus;const cardRemarks=tr.querySelector('[data-key="card_remarks"]');if(cardRemarks&&!cardRemarks.dataset.userEdited)cardRemarks.value=Math.abs(cd)<.01?'POS settlement matched':cd>0?`POS excess Rs. ${cd.toFixed(2)}`:`POS short Rs. ${Math.abs(cd).toFixed(2)}`}
async function saveCashierClosingRows(){const rows=[...document.querySelectorAll('#cashierEntryBody tr')].map(tr=>Object.fromEntries(cashierCols.map(c=>[c[0],tr.querySelector(`[data-key="${c[0]}"]`).value]))).filter(r=>String(r.employee_id||'').trim());if(!rows.length)return alert('At least one entry fill karein.');if(rows.length>50)return alert('Maximum 50 entries allowed.');try{const r=await api('/api/cashier-closing/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:rows})});alert(`${r.inserted} inserted, ${r.updated} updated`);clearCashierClosingRows();await Promise.all([loadCashierClosing(),loadCashierDashboard()])}catch(e){alert(e.message)}}
function clearCashierClosingRows(){buildCashierEntryGrid()}
function cashierPeriodUI(kind){
 const p=$(`cc${kind}Period`)?.value||'all';
 ['Date','Week','Month','Year'].forEach(x=>{const e=$(`cc${kind}${x}`);if(e)e.style.display=(x.toLowerCase()===p?'inline-block':'none')});
}
function cashierParams(kind){const p=new URLSearchParams();const period=$(`cc${kind}Period`)?.value||'all';p.set('period',period);const map={day:'Date',week:'Week',month:'Month',year:'Year'};if(map[period]){const v=$(`cc${kind}${map[period]}`)?.value;if(v)p.set(period,v)};const f=$(`cc${kind}From`)?.value,t=$(`cc${kind}To`)?.value;if(f)p.set('from',f);if(t)p.set('to',t);return p}
function resetCashierFilters(kind){const p=$(`cc${kind}Period`);if(p)p.value='all';['Date','Week','Month','Year','From','To'].forEach(x=>{const e=$(`cc${kind}${x}`);if(e)e.value=''});if(kind==='List'&&$('cashierClosingSearch'))$('cashierClosingSearch').value='';cashierPeriodUI(kind);kind==='Dash'?loadCashierDashboard():kind==='List'?loadCashierClosing():kind==='Shortage'?loadCashierShortage():loadCashierNotes()}
async function loadCashierClosing(){if(!$('cashierClosingBody'))return;const p=cashierParams('List');p.set('q',$('cashierClosingSearch')?.value||'');const rows=await api('/api/cashier-closing?'+p);if($('cashierRecordCount'))$('cashierRecordCount').textContent=`${rows.length.toLocaleString()} records`;let lastDate='';const html=[];for(const r of rows){if(r.closing_date!==lastDate){lastDate=r.closing_date;html.push(`<tr class="cashier-date-group"><td colspan="19">Closing Date: ${esc(lastDate)}</td></tr>`)}const first=Number(r.first_total||0),second=Number(r.second_total||0),third=Number(r.third_total||0),fourth=Number(r.fourth_total||0),close=Number(r.total_closing_cash||0),total=first+second+third+fourth+close,diff=Number(r.collection_difference||0),shortage=diff<0?Math.abs(diff):0,excess=diff>0?diff:0;html.push(`<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td><td>${money(first)}</td><td>${money(second)}</td><td>${money(third)}</td><td>${money(fourth)}</td><td>${money(close)}</td><td><b>${money(total)}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short">${money(shortage)}</td><td class="amount-excess">${money(excess)}</td><td><span class="status-chip ${String(r.audit_status||'').toLowerCase()}">${esc(r.audit_status)}</span></td><td class="remarks-cell">${esc(r.remarks||'')}</td><td>${money(r.ivend_pos)}</td><td>${money(r.settlement_bank)}</td><td>${money(r.card_difference)}</td><td>${esc(r.card_status)}</td><td class="remarks-cell">${esc(r.card_remarks||'')}</td></tr>`)}$('cashierClosingBody').innerHTML=html.join('')||'<tr><td colspan="19">No records found</td></tr>'}
async function loadCashierDashboard(){if(!$('cashierSummaryBody'))return;const d=await api('/api/cashier-closing/dashboard?'+cashierParams('Dash')),t=d.totals;const sv=(id,v)=>{if($(id))$(id).textContent=v};sv('ccTotalClosingCash',money(t.total_closing_cash));sv('ccSystemSales',money(t.system_sales));sv('ccCashDifference',money(t.cash_difference));sv('ccCardDifference',money(t.card_difference));sv('ccShortAmount',money(t.short_amount));sv('ccExcessAmount',money(t.excess_amount));$('cashierSummaryBody').innerHTML=d.summary.map(r=>`<tr><td>${esc(r.period_label)}</td><td>${esc(r.period_start)}</td><td>${esc(r.period_end)}</td><td>${money(r.total_closing_cash)}</td><td>${money(r.system_sales)}</td><td>${money(r.cash_difference)}</td><td>${money(r.ivend_pos)}</td><td>${money(r.settlement_bank)}</td><td>${money(r.card_difference)}</td><td>${money(r.short_amount)}</td><td>${money(r.excess_amount)}</td></tr>`).join('')||'<tr><td colspan="11">No summary found</td></tr>'}
function downloadCashierExcel(kind='Dash'){const p=cashierParams(kind);if(kind==='List')p.set('q',$('cashierClosingSearch')?.value||'');if(kind==='Shortage'){p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'')}if(kind==='Notes'){p.set('note_summary','1');p.set('q',$('cashierNotesSearch')?.value||'')}location.href='/api/export-cashier-closing?'+p.toString()}
function downloadCashierPdf(kind='Dash'){const p=cashierParams(kind);if(kind==='List')p.set('q',$('cashierClosingSearch')?.value||'');if(kind==='Shortage'){p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'')}location.href='/api/pdf-cashier-closing?'+p.toString()}
if($('cashierClosingUpload'))$('cashierClosingUpload').onchange=async()=>{const f=$('cashierClosingUpload').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);try{const r=await api('/api/cashier-closing/import',{method:'POST',body:fd});alert(`${r.inserted} inserted, ${r.updated} updated. Dashboard auto-updated.`);await Promise.all([loadCashierClosing(),loadCashierDashboard(),loadCashierEmployees()])}catch(e){alert(e.message)}finally{$('cashierClosingUpload').value=''}};
document.addEventListener('DOMContentLoaded',()=>{applySavedTheme();setupThemePicker();buildCashierEntryGrid();['Dash','List','Shortage','Notes'].forEach(cashierPeriodUI)});

// Preserve manually typed cashier remarks while auto-calculating amounts.
document.addEventListener('input',e=>{if(e.target?.dataset?.key==='remarks'||e.target?.dataset?.key==='card_remarks')e.target.dataset.userEdited='1'});


// V26 Cashier Shortage, note-wise reports and saved themes
function cashierCashTotal(r){return Number(r.first_total||0)+Number(r.second_total||0)+Number(r.third_total||0)+Number(r.fourth_total||0)+Number(r.total_closing_cash||0)}
async function loadCashierShortage(){if(!$('cashierShortageBody'))return;const p=cashierParams('Shortage');p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'');const rows=await api('/api/cashier-closing?'+p);let total=0;const people=new Set();$('cashierShortageBody').innerHTML=rows.map(r=>{const diff=Number(r.collection_difference||0),shortage=diff<0?Math.abs(diff):0;total+=shortage;people.add(String(r.employee_id));return `<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td><td>${money(r.first_total)}</td><td>${money(r.second_total)}</td><td>${money(r.third_total)}</td><td>${money(r.fourth_total)}</td><td>${money(r.total_closing_cash)}</td><td><b>${money(cashierCashTotal(r))}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short"><b>${money(shortage)}</b></td><td class="remarks-cell">${esc(r.remarks||'Cash shortage')}</td><td>${esc(r.card_status||'')}</td></tr>`}).join('')||'<tr><td colspan="13">No shortage records found</td></tr>';$('cashierShortageTotal').textContent=money(total);$('cashierShortageCount').textContent=rows.length.toLocaleString();$('cashierShortageCashiers').textContent=people.size.toLocaleString()}
let cashierNoteRows=[];
async function loadCashierNotes(){if(!$('cashierNotesBody'))return;const p=cashierParams('Notes');p.set('q',$('cashierNotesSearch')?.value||'');const d=await api('/api/cashier-closing/note-summary?'+p);cashierNoteRows=d.details||[];window.cashierNoteSummary=d.summary||[];$('cashierNotesBody').innerHTML=window.cashierNoteSummary.map((r,i)=>`<tr class="clickable-note" onclick="showCashierNoteDetails(${i})"><td class="remarks-cell">${esc(r.note)}</td><td>${Number(r.records).toLocaleString()}</td><td>${Number(r.cashiers).toLocaleString()}</td><td class="amount-short">${money(r.short_amount)}</td><td class="amount-excess">${money(r.excess_amount)}</td><td>${esc(r.first_date)}</td><td>${esc(r.last_date)}</td></tr>`).join('')||'<tr><td colspan="7">No note-wise records found</td></tr>';if(window.cashierNoteSummary.length)showCashierNoteDetails(0);else $('cashierNoteDetailBody').innerHTML='<tr><td colspan="8">No details found</td></tr>'}
function cashierDenominationCells(r,prefix,isClosing=false){const keys=isClosing?['5000','1000','500','100','75','50','20','10','5','2','1']:['5000','1000','500'];return keys.map(k=>`<td class="denom-cell">${Number(r[`${prefix}_${k}`]||0).toLocaleString()}</td>`).join('')}
function showCashierNoteDetails(index){const s=(window.cashierNoteSummary||[])[index];if(!s)return;const rows=cashierNoteRows.filter(r=>((r.remarks||'').trim()||'No Note / Remark')===s.note);$('cashierNoteDetailTitle').textContent=s.note;$('cashierNoteDetailCount').textContent=`${rows.length} records`;$('cashierNoteDetailBody').innerHTML=rows.map(r=>{const diff=Number(r.collection_difference||0);return `<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td>${cashierDenominationCells(r,'first')}<td class="collection-total">${money(r.first_total)}</td>${cashierDenominationCells(r,'second')}<td class="collection-total">${money(r.second_total)}</td>${cashierDenominationCells(r,'third')}<td class="collection-total">${money(r.third_total)}</td>${cashierDenominationCells(r,'fourth')}<td class="collection-total">${money(r.fourth_total)}</td>${cashierDenominationCells(r,'close',true)}<td class="collection-total">${money(r.total_closing_cash)}</td><td><b>${money(cashierCashTotal(r))}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short">${money(diff<0?Math.abs(diff):0)}</td><td class="amount-excess">${money(diff>0?diff:0)}</td><td class="remarks-cell">${esc((r.remarks||'').trim()||'No Note / Remark')}</td></tr>`}).join('')||'<tr><td colspan="36">No details found</td></tr>'}
const THEMES=['sap-blue','imtiaz-green','graphite','light','dark'];
function setTheme(theme){if(!THEMES.includes(theme))theme='sap-blue';document.documentElement.dataset.theme=theme;localStorage.setItem('rahatTheme',theme);document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===theme));if($('themeStatus'))$('themeStatus').textContent='Current theme: '+({'sap-blue':'SAP Blue','imtiaz-green':'Imtiaz Green','graphite':'Graphite','light':'Clean Light','dark':'Dark Mode'}[theme])}
function applySavedTheme(){setTheme(localStorage.getItem('rahatTheme')||'sap-blue')}
function setupThemePicker(){document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.themeChoice)))}

// V31 Ultimate branding and navigation
const V31_DEFAULT_BRAND={company:'Imtiaz Group Pvt Ltd',title:'Corporate Management Dashboard'};
function getBrandSettings(){try{return {...V31_DEFAULT_BRAND,...JSON.parse(localStorage.getItem('rahatBrand')||'{}')}}catch(_){return {...V31_DEFAULT_BRAND}}}
function applyBrandSettings(){const b=getBrandSettings();document.querySelectorAll('.company-name-text').forEach(el=>el.textContent=b.company);const c=$('companyNameSetting'),t=$('softwareTitleSetting');if(c)c.value=b.company;if(t)t.value=b.title;document.title=`${b.company} — ${b.title}`;const subtitle=document.querySelector('.login-subtitle');if(subtitle)subtitle.textContent=b.title}
function saveBrandSettings(){const company=($('companyNameSetting')?.value||'').trim(),title=($('softwareTitleSetting')?.value||'').trim();if(!company||!title)return alert('Company name and software title are required.');localStorage.setItem('rahatBrand',JSON.stringify({company,title}));applyBrandSettings();if($('brandStatus'))$('brandStatus').textContent='Branding saved successfully.'}
function resetBrandSettings(){localStorage.removeItem('rahatBrand');applyBrandSettings();if($('brandStatus'))$('brandStatus').textContent='Default branding restored.'}
function openPageByName(page){const nav=document.querySelector(`.nav[data-page="${page}"]`);if(nav){const folder=nav.closest('.sap-folder');const group=folder?.querySelector('.sap-tree-group');const children=folder?.querySelector('.sap-folder-children');if(group)group.setAttribute('aria-expanded','true');if(children)children.hidden=false;nav.click()}else{document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===page))}}
function v31Boot(){applyBrandSettings();document.body.classList.add('v31-ready');const d=$('v31Today');if(d)d.textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})}
document.addEventListener('DOMContentLoaded',v31Boot);


// V32 mobile navigation drawer
(function(){
  const app=document.getElementById('app');
  const toggle=document.getElementById('mobileMenuToggle');
  if(toggle && app){
    toggle.addEventListener('click',()=>app.classList.toggle('mobile-menu-open'));
    document.querySelectorAll('.sap-sidebar .nav').forEach(btn=>btn.addEventListener('click',()=>app.classList.remove('mobile-menu-open')));
    document.addEventListener('click',(e)=>{
      if(window.innerWidth<=760 && app.classList.contains('mobile-menu-open') && !e.target.closest('.sap-sidebar') && !e.target.closest('#mobileMenuToggle')) app.classList.remove('mobile-menu-open');
    });
  }
})();


// Return / Exchange Counter Module
let returnApprovers=[];
const returnCols=[['entry_date','Date','date'],['serial_no','S.No.','text'],['customer_name','Customer Name','text'],['contact_no','Contact No','text'],['return_trx','Return Trx','text'],['trx_no','Trx No','text'],['item_description','Item Description','text'],['item_exp_date','Item Exp Date','date'],['qty','Qty','number'],['total_amount','Total Amount','number'],['reason','Reason','text'],['approval_name','Approval Name','select'],['cash_voucher','Cash/Voucher','text'],['received_by','Rcv by','text'],['cctv_time','CCTV/Time','text'],['trx_time','Trx Time','text']];


// Smart limit notifications with sound (V35)
const alertMemory={};
let alertAudioContext=null;
function alertTone(kind='warning'){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    alertAudioContext=alertAudioContext||new AC();
    if(alertAudioContext.state==='suspended')alertAudioContext.resume();
    const now=alertAudioContext.currentTime;
    const tones=kind==='danger'?[880,660,880]:kind==='success'?[520,660]:[620,520];
    tones.forEach((freq,i)=>{const o=alertAudioContext.createOscillator(),g=alertAudioContext.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0.0001,now+i*.16);g.gain.exponentialRampToValueAtTime(.16,now+i*.16+.02);g.gain.exponentialRampToValueAtTime(.0001,now+i*.16+.13);o.connect(g);g.connect(alertAudioContext.destination);o.start(now+i*.16);o.stop(now+i*.16+.14)});
  }catch(e){}
}
function showSmartAlert(key,title,message,kind='warning',signature=''){
  const sig=String(signature||message);
  if(alertMemory[key]===sig)return;
  alertMemory[key]=sig;
  const host=document.getElementById('smartAlertHost');if(!host)return;
  const el=document.createElement('div');el.className=`smart-alert ${kind}`;
  el.innerHTML=`<div class="smart-alert-icon">${kind==='danger'?'!':kind==='success'?'✓':'i'}</div><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div><button aria-label="Close">×</button>`;
  el.querySelector('button').onclick=()=>el.remove();host.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));alertTone(kind);
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),250)},9000);
}
function notifyCashLimit(type,balance,limit,state){
  const key=type==='Head Cash'?'head-cash-limit':'petty-cash-limit';
  const title=`${type} Limit Alert`;
  const diff=Math.abs(Number(balance)-Number(limit));
  if(state.text==='LIMIT EXCEEDED')showSmartAlert(key,title,`${money(balance)} balance approved limit ${money(limit)} se ${money(diff)} zyada hai.`,'danger',`${state.text}:${Math.round(balance)}`);
  else if(state.text==='BELOW LIMIT')showSmartAlert(key,title,`${money(balance)} balance approved limit ${money(limit)} se ${money(diff)} neeche hai.`,'warning',`${state.text}:${Math.round(balance)}`);
  else showSmartAlert(key,title,`Balance approved limit ${money(limit)} ke bilkul barabar hai.`,'success',`${state.text}:${Math.round(balance)}`);
}
function notifyReturnExceeded(totals){
  const count=Number(totals.exceeded_entries||0),amount=Number(totals.exceeded_amount||0);
  if(count>0)showSmartAlert('return-exceeded','Return Counter Approval Alert',`${count.toLocaleString()} exceeded entries hain. Exceeded approval amount ${money(amount)} hai.`,'danger',`${count}:${Math.round(amount)}`);
  else showSmartAlert('return-exceeded','Return Counter Approval Status','Koi approval limit exceeded entry nahi hai.','success','clear');
}
['click','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{try{if(alertAudioContext?.state==='suspended')alertAudioContext.resume()}catch(e){}},{once:false,passive:true}));

async function loadReturnApprovers(){try{returnApprovers=await api('/api/return-approvers');const opts='<option value="">All Approval Names</option>'+returnApprovers.map(x=>`<option>${esc(x.management_name)}</option>`).join('');if($('returnApproval'))$('returnApproval').innerHTML=opts;}catch(e){}}
function returnApproverOptions(){return '<option value="">Select Approval</option>'+returnApprovers.map(x=>`<option value="${esc(x.management_name)}">${esc(x.management_name)} — ${esc(x.designation)} (${x.unlimited?'Unlimited':money(x.approval_limit)})</option>`).join('')}
function buildReturnEntryHead(){if($('returnEntryHead'))$('returnEntryHead').innerHTML='<tr><th>#</th>'+returnCols.map(c=>`<th>${c[1]}</th>`).join('')+'<th>Remove</th></tr>'}
function addReturnRows(n=10){buildReturnEntryHead();const body=$('returnEntryBody');if(!body)return;for(let i=0;i<n;i++){const tr=document.createElement('tr');tr.innerHTML=`<td>${body.children.length+1}</td>`+returnCols.map(c=>`<td>${c[2]==='select'?`<select data-key="${c[0]}">${returnApproverOptions()}</select>`:`<input data-key="${c[0]}" type="${c[2]}" ${c[2]==='number'?'step="any"':''}>`}</td>`).join('')+'<td><button class="mini danger-btn" type="button">×</button></td>';tr.querySelector('button').onclick=()=>tr.remove();body.appendChild(tr)}}
function clearReturnRows(){if($('returnEntryBody'))$('returnEntryBody').innerHTML='';addReturnRows(10);if($('returnPasteArea'))$('returnPasteArea').value='';showReturnPasteErrors([])}
function parseReturnPaste(){const text=$('returnPasteArea')?.value||'';if(!text.trim())return [];const lines=text.replace(/\r/g,'').split('\n').filter(x=>x.trim());const rows=lines.map(line=>line.split('\t'));if(rows.length&&rows[0].some(v=>/customer|trx|amount|approval|date/i.test(v))){rows.shift()}return rows.map(vals=>Object.fromEntries(returnCols.map((col,i)=>[col[0],String(vals[i]??'').trim()]))) }
function showReturnPasteErrors(errors){const box=$('returnPasteErrors');if(!box)return;box.innerHTML=errors.length?`<h4>Invalid Rows (${errors.length})</h4><div class="paste-error-list">${errors.map(x=>`<div><b>Row ${x.row}:</b> ${esc((x.errors||[]).join(', '))}</div>`).join('')}</div>`:'<span class="muted">Invalid rows will appear here. Valid rows will still be saved.</span>'}
async function saveReturnPaste(){const rows=parseReturnPaste();if(!rows.length)return alert('Excel rows copy karke paste area mein paste karein.');try{const d=await api('/api/return-entries/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:rows})});showReturnPasteErrors(d.invalid||[]);alert(`${d.inserted} valid entries saved. ${d.invalid_count||0} invalid rows not saved.`);if(d.inserted){$('returnPasteArea').value='';loadReturnEntries()}}catch(e){alert(e.message)}}
async function saveReturnRows(){const rows=[...document.querySelectorAll('#returnEntryBody tr')].map(tr=>Object.fromEntries(returnCols.map(c=>[c[0],tr.querySelector(`[data-key="${c[0]}"]`)?.value||'']))).filter(r=>Object.values(r).some(v=>String(v).trim()));if(!rows.length)return alert('At least one entry fill karein.');try{const d=await api('/api/return-entries/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:rows})});showReturnPasteErrors(d.invalid||[]);alert(`${d.inserted} valid entries saved. ${d.invalid_count||0} invalid rows not saved.`);if(d.inserted){clearReturnRows();loadReturnEntries()}}catch(e){alert(e.message)}}
function returnPeriodUI(){const p=$('returnPeriod')?.value||'all';['Date','Week','Month','Year'].forEach(x=>{const e=$('return'+x);if(e)e.style.display=(x.toLowerCase()===p?'inline-block':'none')});const custom=p==='custom';if($('returnFrom'))$('returnFrom').style.display=custom?'inline-block':'none';if($('returnTo'))$('returnTo').style.display=custom?'inline-block':'none'}
function returnParams(){const p=new URLSearchParams(),period=$('returnPeriod')?.value||'all';p.set('period',period);const map={day:'Date',week:'Week',month:'Month',year:'Year'};if(map[period]){const v=$('return'+map[period])?.value;if(v)p.set(period,v)};for(const [id,key] of [['returnFrom','from'],['returnTo','to'],['returnSearch','q'],['returnApproval','approval'],['returnSource','source']]){const v=$(id)?.value;if(v)p.set(key,v)}return p}
async function loadReturnEntries(){if(!$('returnBody'))return;try{const d=await api('/api/return-entries?'+returnParams());$('returnCashAmount').textContent=money(d.totals.cash_amount);$('returnVoucherAmount').textContent=money(d.totals.voucher_amount);$('returnTotal').textContent=money(d.totals.total_amount);$('returnValid').textContent=money(d.totals.valid_amount);$('returnExceeded').textContent=money(d.totals.exceeded_amount);$('returnValidCount').textContent=Number(d.totals.valid_entries||0).toLocaleString();$('returnExceededCount').textContent=Number(d.totals.exceeded_entries||0).toLocaleString();$('returnCount').textContent=Number(d.totals.records||0).toLocaleString();notifyReturnExceeded(d.totals);const cur=$('returnSource').value;$('returnSource').innerHTML='<option value="">All Files</option>'+d.sources.map(x=>`<option>${esc(x)}</option>`).join('');$('returnSource').value=cur;$('returnBody').innerHTML=d.rows.map(r=>`<tr><td><input class="returnRow" type="checkbox" value="${r.id}"></td><td>${esc(r.entry_date)}</td><td>${esc(r.serial_no)}</td><td>${esc(r.customer_name)}</td><td>${esc(r.contact_no)}</td><td>${esc(r.return_trx)}</td><td>${esc(r.trx_no)}</td><td class="remarks-cell">${esc(r.item_description)}</td><td>${esc(r.item_exp_date)}</td><td>${Number(r.qty||0)}</td><td>${money(r.total_amount)}</td><td class="remarks-cell">${esc(r.reason)}</td><td>${esc(r.approval_name)}</td><td>${esc(r.designation)}</td><td>${r.approval_limit?money(r.approval_limit):'Unlimited'}</td><td><span class="status-chip ${r.system_status==='Limit Exceeded'?'short':'matched'}">${esc(r.system_status)}</span></td><td>${esc(r.cash_voucher)}</td><td>${esc(r.received_by)}</td><td>${esc(r.cctv_time)}</td><td>${esc(r.trx_time)}</td><td>${esc(r.source_file)}</td><td>${esc(r.source_sheet)}</td></tr>`).join('')||'<tr><td colspan="22">No return entries found</td></tr>'}catch(e){alert(e.message)}}
function resetReturnFilters(){for(const id of ['returnDate','returnWeek','returnMonth','returnYear','returnFrom','returnTo','returnSearch'])if($(id))$(id).value='';if($('returnPeriod'))$('returnPeriod').value='all';if($('returnApproval'))$('returnApproval').value='';if($('returnSource'))$('returnSource').value='';returnPeriodUI();loadReturnEntries()}
async function deleteSelectedReturns(){const ids=[...document.querySelectorAll('.returnRow:checked')].map(x=>x.value);if(!ids.length)return alert('Select entries first.');if(!confirm(`Delete ${ids.length} selected entries?`))return;try{const d=await api('/api/return-entries/delete-selected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});alert(`${d.deleted} deleted`);loadReturnEntries()}catch(e){alert(e.message)}}
function downloadReturnExcel(){location.href='/api/export-return-entries?'+returnParams()}
function downloadReturnPDF(){location.href='/api/export-return-entries.pdf?'+returnParams()}
if($('returnUpload'))$('returnUpload').onchange=async()=>{const f=$('returnUpload').files[0],month=$('returnImportMonth').value;if(!f)return;if(!month){alert('Pehle file month select karein.');$('returnUpload').value='';return}const fd=new FormData();fd.append('file',f);fd.append('month',month);try{const d=await api('/api/return-entries/import',{method:'POST',body:fd});alert(`${d.inserted} entries imported from ${d.file}`);await loadReturnApprovers();loadReturnEntries()}catch(e){alert(e.message)}finally{$('returnUpload').value=''}};
setTimeout(async()=>{await loadReturnApprovers();returnPeriodUI();if($('returnEntryBody'))clearReturnRows()},500);

document.addEventListener('click',e=>{const b=e.target.closest('.nav[data-page="returnCounter"]');if(b)setTimeout(loadReturnEntries,50)});

setInterval(()=>{if(currentUser&&can('user_manage')&&document.getElementById('users')?.classList.contains('active'))loadUsers().catch(()=>{});},30000);


async function loadExceptions(){if(!$('exceptionGrid'))return;const rows=await api('/api/accounts/exceptions');$('exceptionGrid').innerHTML=rows.map(r=>`<div class="exception-card ${String(r.severity).toLowerCase()}"><span>${esc(r.severity)}</span><h3>${esc(r.type)}</h3><strong>${Number(r.count||0).toLocaleString()}</strong>${r.amount?`<b>${money(r.amount)}</b>`:''}<p>${esc(r.details||'')}</p></div>`).join('')||'<div class="panel"><h3>All Clear</h3><p>No current exceptions found.</p></div>'}
async function runReconciliation(){const a=$('reconSource').files[0],b=$('reconTarget').files[0];if(!a||!b)return alert('Dono Excel files select karein.');const fd=new FormData();fd.append('source_file',a);fd.append('target_file',b);fd.append('title',$('reconTitle').value||'SAP vs Software');const r=await api('/api/accounts/reconcile',{method:'POST',body:fd});$('reconMatched').textContent=r.counts.Matched;$('reconDiff').textContent=r.counts['Amount Difference'];$('reconUnmatched').textContent=r.counts.Unmatched;await loadReconResults(r.run_id,'reconBody');await loadExceptions()}
async function loadReconResults(runId,bodyId){const rows=await api('/api/accounts/reconciliation-results?run_id='+encodeURIComponent(runId));$(bodyId).innerHTML=rows.map(r=>`<tr><td>${esc(r.document_number)}</td><td>${money(r.source_amount)}</td><td>${money(r.target_amount)}</td><td>${money(r.difference)}</td><td><span class="recon-status ${r.status.toLowerCase().replaceAll(' ','-')}">${esc(r.status)}</span></td></tr>`).join('')||'<tr><td colspan="5">No results</td></tr>'}
async function loadAging(){if(!$('agingBody'))return;const rows=await api('/api/accounts/aging?kind='+($('agingKind')?.value||'customer'));$('agingBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td>${money(r['0_30'])}</td><td>${money(r['31_60'])}</td><td>${money(r['61_90'])}</td><td class="amount-short">${money(r['90_plus'])}</td><td><b>${money(r.total)}</b></td><td>${esc(r.last_date||'')}</td></tr>`).join('')||'<tr><td colspan="8">No ledger data</td></tr>'}
async function runBankReconciliation(){const a=$('bankFile').files[0],b=$('bankLedgerFile').files[0];if(!a||!b)return alert('Bank aur Ledger dono files select karein.');const fd=new FormData();fd.append('bank_file',a);fd.append('ledger_file',b);const r=await api('/api/accounts/bank-reconcile',{method:'POST',body:fd});$('bankMatched').textContent=r.counts.Matched;$('bankDiff').textContent=r.counts['Amount Difference'];$('bankUnmatched').textContent=r.counts.Unmatched;await loadReconResults(r.run_id,'bankReconBody');await loadExceptions()}


async function loadDailyClosing(){if(!$('dailyClosingBody'))return;const p=new URLSearchParams();if($('dcFrom')?.value)p.set('from',$('dcFrom').value);if($('dcTo')?.value)p.set('to',$('dcTo').value);const rows=await api('/api/accounts/daily-closing?'+p);$('dailyClosingBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${money(r.head_balance)}</td><td>${money(r.petty_balance)}</td><td>${money(r.closing_cash)}</td><td>${money(r.system_sale)}</td><td class="${Math.abs(r.cash_difference)>.01?'amount-short':''}">${money(r.cash_difference)}</td><td>${money(r.bank_settlement)}</td><td class="${Math.abs(r.card_difference)>.01?'amount-short':''}">${money(r.card_difference)}</td><td><span class="status-chip ${String(r.status).toLowerCase()}">${esc(r.status)}</span></td></tr>`).join('')||'<tr><td colspan="9">No closing data found</td></tr>'}
async function loadApprovals(){if(!$('approvalBody'))return;const rows=await api('/api/accounts/approvals');$('approvalBody').innerHTML=rows.map(r=>`<tr><td>${r.id}</td><td>${esc(r.request_type)}</td><td>${esc(r.reference_no)}</td><td>${money(r.amount)}</td><td>${esc(r.reason||'')}</td><td>${esc(r.maker||'')}</td><td>${esc(r.checker||'')}</td><td>${esc(r.approver||'')}</td><td><span class="status-chip">${esc(r.status)}</span></td><td><button onclick="approvalAction(${r.id},'check')">Check</button> <button onclick="approvalAction(${r.id},'approve')">Approve</button> <button class="danger" onclick="approvalAction(${r.id},'reject')">Reject</button></td></tr>`).join('')||'<tr><td colspan="10">No approval requests</td></tr>'}
async function createApproval(){try{await api('/api/accounts/approvals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_type:$('approvalType').value,reference_no:$('approvalRef').value,amount:$('approvalAmount').value,reason:$('approvalReason').value})});$('approvalRef').value='';$('approvalAmount').value='';$('approvalReason').value='';await loadApprovals()}catch(e){alert(e.message)}}
async function approvalAction(id,action){try{await api(`/api/accounts/approvals/${id}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});await loadApprovals()}catch(e){alert(e.message)}}
async function loadPeriodLocks(){if(!$('periodLockBody'))return;const rows=await api('/api/accounts/period-locks');$('periodLockBody').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.period_key)}</b></td><td>${esc(r.locked_by||'')}</td><td>${esc(r.locked_at||'')}</td><td>${esc(r.reason||'')}</td><td><button class="danger" onclick="unlockPeriod('${esc(r.period_key)}')">Unlock</button></td></tr>`).join('')||'<tr><td colspan="5">No locked periods</td></tr>'}
async function addPeriodLock(){try{await api('/api/accounts/period-locks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period_key:$('lockPeriod').value,reason:$('lockReason').value})});$('lockReason').value='';await loadPeriodLocks()}catch(e){alert(e.message)}}
async function unlockPeriod(key){if(!confirm(`Unlock ${key}?`))return;try{await api('/api/accounts/period-locks/'+encodeURIComponent(key),{method:'DELETE'});await loadPeriodLocks()}catch(e){alert(e.message)}}
document.addEventListener('click',e=>{const p=e.target.closest('.nav')?.dataset.page;if(p==='dailyClosing')setTimeout(loadDailyClosing,50);if(p==='approvals')setTimeout(loadApprovals,50);if(p==='periodLock')setTimeout(loadPeriodLocks,50)});


// V38 SAP-level transaction context, favorites and keyboard behavior
const SAP_PAGE_META={dashboard:['DS','Dashboard'],corporate:['CC','Corporate Customers'],vendorLedger:['VL','Vendor Ledger'],vendors:['SV','Scrap Vendors'],headCash:['HC','Head Cash'],pettyCash:['PC','Petty Cash'],lostFound:['LF','Lost & Found'],theftCash:['TC','Theft Cash'],cashierDashboard:['CD','Cashier Closing Dashboard'],cashierClosing:['CL','Cashier Closing Entry'],cashierShortage:['CS','Cashier Shortage'],cashierNotes:['CN','Cashier Note-wise Report'],returnCounter:['RC','Return / Exchange'],duplicates:['DD','Duplicate Documents'],deletedCash:['DE','Deleted Entries'],users:['UR','Users & Rights'],audit:['AL','Activity Log'],exceptions:['EX','Exception Dashboard'],reconciliation:['RE','Reconciliation Center'],aging:['AG','Customer / Vendor Aging'],bankRecon:['BR','Bank Reconciliation'],dailyClosing:['DC','Daily Accounts Closing'],approvals:['AP','Approval Workflow'],periodLock:['PL','Period Lock'],auditReport:['AR','Automated Audit Report'],cashFlow:['CF','Cash Flow Forecast'],budgetControl:['BC','Budget vs Actual'],monthEnd:['ME','Month-End Close'],journalVoucher:['JV','Journal Voucher'],trialBalance:['TB','Trial Balance'],accruals:['AC','Accruals & Prepayments'],fixedAssets:['FA','Fixed Asset Register'],financeHealth:['FH','Finance Health Cockpit'],financialStatements:['FS','Financial Statements'],costCenters:['CC','Cost Center Analysis'],taxCenter:['TX','Tax & Withholding Center'],paymentCalendar:['PY','Payment Calendar'],settings:['SB','Settings & Backup']};
let sapPageHistory=[];
function activeSapPage(){return document.querySelector('.page.active')?.id||'dashboard'}
function sapStoreCode(){const raw=(document.getElementById('activeStoreFolderTitle')?.textContent||'S024').trim();return (raw.match(/S\d{3}/)||['S024'])[0]}
function updateSapContext(page=activeSapPage()){
 const meta=SAP_PAGE_META[page]||['--',page];
 if($('sapCurrentTcode'))$('sapCurrentTcode').textContent=meta[0];if($('sapCurrentModule'))$('sapCurrentModule').textContent=meta[1];
 const store=sapStoreCode();if($('sapCurrentStore'))$('sapCurrentStore').textContent=store;if($('sapStatusStore'))$('sapStatusStore').textContent='Store: '+store;if($('sapStatusModule'))$('sapStatusModule').textContent='T-Code: '+meta[0];
 const now=new Date();if($('sapFiscalPeriod'))$('sapFiscalPeriod').textContent=now.toLocaleString('en',{month:'short',year:'numeric'});
 const name=currentUser?.full_name||currentUser?.username||'Rahat Ullah';if($('sapContextUser'))$('sapContextUser').textContent=name;if($('sapStatusUser'))$('sapStatusUser').textContent='▣ User: '+name;
 document.title=`${meta[0]} - ${meta[1]} | Rahat Corporate Management`;
 const favs=JSON.parse(localStorage.getItem('sapFavorites')||'[]');const btn=[...document.querySelectorAll('.sap-context-actions button')].find(x=>x.textContent.includes('Favorite'));if(btn)btn.textContent=(favs.includes(page)?'★':'☆')+' Favorite';
}
function sapRefresh(){const page=activeSapPage();const loaders={dashboard:loadDashboard,corporate:loadCorporate,vendorLedger:loadVendorLedger,vendors:loadVendors,headCash:()=>loadCash('Head Cash'),pettyCash:()=>loadCash('Petty Cash'),exceptions:loadExceptions,aging:loadAging,dailyClosing:loadDailyClosing,approvals:loadApprovals,periodLock:loadPeriodLocks,audit:loadAudit,cashFlow:loadCashFlow,budgetControl:loadBudgetControl,monthEnd:loadMonthEnd,journalVoucher:loadJournalVouchers,trialBalance:loadTrialBalance,accruals:loadAccruals,fixedAssets:loadFixedAssets,financeHealth:loadFinanceHealth,financialStatements:loadFinancialStatements,costCenters:loadCostCenters,taxCenter:loadTaxRegister,paymentCalendar:loadPaymentCalendar,users:loadUsers,returnCounter:loadReturnEntries};const fn=loaders[page];if(fn)Promise.resolve(fn()).catch(e=>alert(e.message));else location.reload();updateSapContext(page)}
function sapBack(){const previous=sapPageHistory.pop();if(previous&&previous!==activeSapPage())openPageByName(previous)}
function toggleSapFavorite(){const page=activeSapPage();let favs=JSON.parse(localStorage.getItem('sapFavorites')||'[]');favs=favs.includes(page)?favs.filter(x=>x!==page):[...favs,page];localStorage.setItem('sapFavorites',JSON.stringify(favs));updateSapContext(page);showSmartAlert('sap-favorite','SAP Favorites',`${SAP_PAGE_META[page]?.[1]||page} ${favs.includes(page)?'favorites mein add':'favorites se remove'} ho gaya.`,'success',String(favs.includes(page)))}
document.addEventListener('click',e=>{const nav=e.target.closest('.nav[data-page]');if(!nav)return;const old=activeSapPage(),next=nav.dataset.page;if(old!==next)sapPageHistory.push(old);setTimeout(()=>updateSapContext(next),0)});
document.addEventListener('keydown',e=>{if(e.key==='F3'){e.preventDefault();sapBack()}if(e.key==='F5'){e.preventDefault();sapRefresh()}if(e.ctrlKey&&e.key.toLowerCase()==='p'){e.preventDefault();window.print()}if(e.altKey&&e.key.toLowerCase()==='f'){e.preventDefault();toggleSapFavorite()}});
const sapObserver=new MutationObserver(()=>updateSapContext());document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.page').forEach(p=>sapObserver.observe(p,{attributes:true,attributeFilter:['class']}));updateSapContext();setInterval(updateSapContext,30000)});

// V39 SAP Advanced Productivity Layer: command palette, breadcrumbs, density and session context
(function(){
 const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
 function toast(message,type='success'){
   let stack=q('.sap-toast-stack');if(!stack){stack=document.createElement('div');stack.className='sap-toast-stack';document.body.appendChild(stack)}
   const el=document.createElement('div');el.className='sap-toast '+type;el.textContent=message;stack.appendChild(el);setTimeout(()=>el.remove(),3200);
 }
 window.sapAdvancedToast=toast;
 function pageLabel(page){const m=window.SAP_PAGE_META?.[page]||SAP_PAGE_META?.[page];return m?`${m[0]} · ${m[1]}`:page}
 function buildStrip(){
   if(q('.sap-advanced-strip'))return;
   const anchor=q('.sap-context-bar')||q('.sap-toolbar')||q('header')||q('.topbar');
   const strip=document.createElement('div');strip.className='sap-advanced-strip';strip.innerHTML=`<div class="sap-breadcrumb">SAP Easy Access › Dashboard</div><div class="sap-runtime"><span class="sap-runtime-badge" id="sapLiveClock">--:--:--</span><span class="sap-runtime-badge" id="sapSessionMode">Mode: Online</span><span class="sap-runtime-badge">F4 / Ctrl+K: Command</span><button type="button" id="sapDensityBtn">Density</button><button type="button" id="sapTableToolsBtn">Table Tools</button></div>`;
   if(anchor)anchor.insertAdjacentElement('afterend',strip);else document.body.prepend(strip);
   q('#sapDensityBtn')?.addEventListener('click',cycleDensity);q('#sapTableToolsBtn')?.addEventListener('click',()=>q('.sap-table-tools')?.classList.toggle('open'));
 }
 function cycleDensity(){
   const states=['normal','compact','comfortable'];let cur=localStorage.getItem('sapDensity')||'normal';let next=states[(states.indexOf(cur)+1)%states.length];
   document.body.classList.remove('sap-compact','sap-comfortable');if(next!=='normal')document.body.classList.add('sap-'+next);localStorage.setItem('sapDensity',next);toast(`Table density: ${next}`,'success');
 }
 function applyDensity(){const d=localStorage.getItem('sapDensity')||'normal';document.body.classList.remove('sap-compact','sap-comfortable');if(d!=='normal')document.body.classList.add('sap-'+d)}
 function buildTableTools(){
   if(q('.sap-table-tools'))return;const box=document.createElement('div');box.className='sap-table-tools';box.innerHTML=`<b>Table Personalization</b><button type="button" data-act="compact">Compact rows</button><button type="button" data-act="comfortable">Comfortable rows</button><button type="button" data-act="normal">Default rows</button><button type="button" data-act="top">Go to table top</button><button type="button" data-act="close">Close</button>`;document.body.appendChild(box);
   box.addEventListener('click',e=>{const a=e.target.dataset.act;if(!a)return;if(['compact','comfortable','normal'].includes(a)){localStorage.setItem('sapDensity',a);applyDensity();toast(`Table density: ${a}`)}if(a==='top'){q('.page.active table')?.scrollIntoView({behavior:'smooth',block:'start'})}if(a==='close')box.classList.remove('open')});
 }
 function commands(){return Object.entries(SAP_PAGE_META||{}).map(([page,m])=>({code:m[0],title:m[1],desc:`Open ${m[1]}`,page}));}
 function buildPalette(){
   if(q('.sap-command-overlay'))return;const ov=document.createElement('div');ov.className='sap-command-overlay';ov.innerHTML=`<div class="sap-command-box"><div class="sap-command-head">SAP Command Center <span>Esc to close · Enter to open</span></div><input class="sap-command-input" placeholder="Enter T-Code, module or action..." autocomplete="off"><div class="sap-command-results"></div></div>`;document.body.appendChild(ov);
   const input=q('.sap-command-input',ov);input.addEventListener('input',renderCommands);input.addEventListener('keydown',paletteKeys);ov.addEventListener('click',e=>{if(e.target===ov)closePalette()});q('.sap-command-results',ov).addEventListener('click',e=>{const item=e.target.closest('.sap-command-item');if(item)executeCommand(item.dataset.page)});
 }
 function openPalette(){buildPalette();const ov=q('.sap-command-overlay');ov.classList.add('open');const input=q('.sap-command-input',ov);input.value='';renderCommands();setTimeout(()=>input.focus(),0)}
 function closePalette(){q('.sap-command-overlay')?.classList.remove('open')}
 function renderCommands(){
   const ov=q('.sap-command-overlay'), input=q('.sap-command-input',ov), term=input.value.trim().toLowerCase();let rows=commands().filter(x=>!term||`${x.code} ${x.title} ${x.desc}`.toLowerCase().includes(term)).slice(0,30);
   q('.sap-command-results',ov).innerHTML=rows.map((x,i)=>`<div class="sap-command-item ${i===0?'active':''}" data-page="${x.page}"><div class="sap-command-code">${x.code}</div><div><b>${x.title}</b><div class="sap-command-desc">${x.desc}</div></div><div class="sap-command-key">Enter</div></div>`).join('')||'<div class="sap-command-item">No command found</div>';
 }
 function paletteKeys(e){const items=qa('.sap-command-item[data-page]',q('.sap-command-overlay'));let i=items.findIndex(x=>x.classList.contains('active'));if(e.key==='ArrowDown'){e.preventDefault();items[i]?.classList.remove('active');i=Math.min(i+1,items.length-1);items[i]?.classList.add('active');items[i]?.scrollIntoView({block:'nearest'})}if(e.key==='ArrowUp'){e.preventDefault();items[i]?.classList.remove('active');i=Math.max(i-1,0);items[i]?.classList.add('active');items[i]?.scrollIntoView({block:'nearest'})}if(e.key==='Enter'){e.preventDefault();const x=items[i]||items[0];if(x)executeCommand(x.dataset.page)}if(e.key==='Escape')closePalette()}
 function executeCommand(page){closePalette();if(typeof openPageByName==='function'){openPageByName(page);toast(`${pageLabel(page)} opened`)}else{q(`.nav[data-page="${page}"]`)?.click()}}
 function updateAdvancedContext(){
   const page=typeof activeSapPage==='function'?activeSapPage():(q('.page.active')?.id||'dashboard');const store=typeof sapStoreCode==='function'?sapStoreCode():'S024';const bc=q('.sap-breadcrumb');if(bc)bc.textContent=`SAP Easy Access › ${store} › ${pageLabel(page)}`;
   const c=q('#sapLiveClock');if(c)c.textContent=new Date().toLocaleTimeString('en-GB');
 }
 document.addEventListener('keydown',e=>{if((e.key==='F4'||(e.ctrlKey&&e.key.toLowerCase()==='k'))&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();openPalette()}if(e.key==='Escape')closePalette()});
 document.addEventListener('DOMContentLoaded',()=>{buildStrip();buildPalette();buildTableTools();applyDensity();updateAdvancedContext();setInterval(updateAdvancedContext,1000);toast('SAP Advanced Productivity Layer active','success')});
 document.addEventListener('click',e=>{if(e.target.closest('.nav[data-page]'))setTimeout(updateAdvancedContext,0);if(!e.target.closest('.sap-table-tools')&&!e.target.closest('#sapTableToolsBtn'))q('.sap-table-tools')?.classList.remove('open')});
})();

// V40 SAP Ultra Control Layer: saved views, universal table tools, auto refresh and session monitor
(function(){
 const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
 const activePage=()=>q('.page.active');
 const activeTable=()=>q('.page.active table');
 const pageId=()=>activePage()?.id||'dashboard';
 function toast(msg,type='success'){if(window.sapAdvancedToast)return window.sapAdvancedToast(msg,type);alert(msg)}
 function csvCell(v){v=String(v??'').replace(/\s+/g,' ').trim();return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
 function exportActiveTable(){
   const table=activeTable();if(!table)return toast('Is screen par export karne ke liye table nahi hai.','warning');
   const rows=qa('tr',table).filter(r=>r.offsetParent!==null).map(r=>qa('th,td',r).filter(c=>c.offsetParent!==null).map(c=>csvCell(c.innerText)).join(','));
   const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${pageId()}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);toast('Current table CSV export ho gayi.');
 }
 function toggleColumns(){
   const table=activeTable();if(!table)return toast('Current screen par table nahi hai.','warning');
   let box=q('.sap-column-manager');if(box)box.remove();box=document.createElement('div');box.className='sap-column-manager';
   const heads=qa('thead th',table);box.innerHTML=`<div class="sap-column-title"><b>Column Layout</b><button type="button">×</button></div><div class="sap-column-list"></div><button class="sap-reset-columns" type="button">Show All Columns</button>`;
   const list=q('.sap-column-list',box);heads.forEach((h,i)=>{const label=document.createElement('label');label.innerHTML=`<input type="checkbox" ${h.style.display==='none'?'':'checked'}> ${h.innerText||('Column '+(i+1))}`;q('input',label).onchange=e=>qa('tr',table).forEach(r=>{const c=qa('th,td',r)[i];if(c)c.style.display=e.target.checked?'':'none'});list.appendChild(label)});
   q('.sap-column-title button',box).onclick=()=>box.remove();q('.sap-reset-columns',box).onclick=()=>{qa('th,td',table).forEach(c=>c.style.display='');box.remove()};document.body.appendChild(box);
 }
 function saveView(){
   const table=activeTable();const page=pageId();const state={density:document.body.classList.contains('sap-compact')?'compact':document.body.classList.contains('sap-comfortable')?'comfortable':'normal',hidden:table?qa('thead th',table).map((h,i)=>h.style.display==='none'?i:null).filter(i=>i!==null):[]};
   localStorage.setItem('sapView:'+page,JSON.stringify(state));toast(`Saved view: ${SAP_PAGE_META[page]?.[1]||page}`);
 }
 function applyView(){
   const page=pageId(),state=JSON.parse(localStorage.getItem('sapView:'+page)||'null');if(!state)return;
   document.body.classList.remove('sap-compact','sap-comfortable');if(state.density==='compact')document.body.classList.add('sap-compact');if(state.density==='comfortable')document.body.classList.add('sap-comfortable');
   const table=activeTable();if(table){qa('tr',table).forEach(r=>qa('th,td',r).forEach((c,i)=>c.style.display=state.hidden.includes(i)?'none':''))}
 }
 let refreshTimer=null,refreshSeconds=0;
 function setAutoRefresh(){
   const raw=prompt('Auto refresh seconds enter karein (0 = Off):',String(refreshSeconds||60));if(raw===null)return;const sec=Math.max(0,Number(raw)||0);refreshSeconds=sec;clearInterval(refreshTimer);refreshTimer=null;
   if(sec>=10){refreshTimer=setInterval(()=>{if(document.visibilityState==='visible'&&typeof sapRefresh==='function')sapRefresh()},sec*1000);toast(`Auto refresh every ${sec} seconds enabled.`)}else toast('Auto refresh off.','warning');updateMonitor();
 }
 function updateMonitor(){
   const el=q('#sapUltraMonitor');if(!el)return;const nav=performance.getEntriesByType('navigation')[0];const load=nav?Math.round(nav.loadEventEnd||performance.now()):Math.round(performance.now());el.innerHTML=`<span>Session: ${Math.floor(performance.now()/60000)} min</span><span>Page load: ${load} ms</span><span>Auto refresh: ${refreshSeconds?refreshSeconds+'s':'Off'}</span>`;
 }
 function buildUltraBar(){
   if(q('.sap-ultra-bar'))return;const strip=q('.sap-advanced-strip');if(!strip)return;const bar=document.createElement('div');bar.className='sap-ultra-bar';bar.innerHTML=`<div class="sap-ultra-left"><b>SAP Control Layer V40</b><span id="sapUltraPage">Current Transaction</span></div><div id="sapUltraMonitor" class="sap-ultra-monitor"></div><div class="sap-ultra-actions"><button id="sapSaveView">Save View</button><button id="sapColumns">Columns</button><button id="sapCsv">Export CSV</button><button id="sapAutoRefresh">Auto Refresh</button><button id="sapPrintActive">Print</button></div>`;strip.insertAdjacentElement('afterend',bar);
   q('#sapSaveView').onclick=saveView;q('#sapColumns').onclick=toggleColumns;q('#sapCsv').onclick=exportActiveTable;q('#sapAutoRefresh').onclick=setAutoRefresh;q('#sapPrintActive').onclick=()=>window.print();updateMonitor();
 }
 function transactionChanged(){buildUltraBar();const p=pageId(),m=SAP_PAGE_META[p]||['--',p];const label=q('#sapUltraPage');if(label)label.textContent=`${m[0]} · ${m[1]}`;setTimeout(applyView,80);updateMonitor()}
 document.addEventListener('DOMContentLoaded',()=>{buildUltraBar();transactionChanged();setInterval(updateMonitor,30000)});
 document.addEventListener('click',e=>{if(e.target.closest('.nav[data-page]'))setTimeout(transactionChanged,120)});
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='e'){e.preventDefault();exportActiveTable()}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='s'){e.preventDefault();saveView()}});
})();

// V41 SAP Executive Control Layer: global table search, recent transactions, data-quality scan and row focus
(function(){
 const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
 const activePage=()=>q('.page.active');
 const activeTable=()=>q('.page.active table');
 const pageId=()=>activePage()?.id||'dashboard';
 function toast(msg,type='success'){if(window.sapAdvancedToast)return window.sapAdvancedToast(msg,type);alert(msg)}
 function meta(page){return (typeof SAP_PAGE_META!=='undefined'&&SAP_PAGE_META[page])||['--',page]}
 function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}
 function visibleDataRows(table){return qa('tbody tr',table).filter(r=>r.offsetParent!==null)}
 function buildExecutiveBar(){
   if(q('.sap-executive-bar'))return;
   const anchor=q('.sap-ultra-bar')||q('.sap-advanced-strip');if(!anchor)return;
   const bar=document.createElement('div');bar.className='sap-executive-bar';
   bar.innerHTML=`<div class="sap-exec-brand"><b>SAP Executive V41</b><span>Control · Quality · Navigation</span></div><div class="sap-exec-search"><input id="sapGlobalTableSearch" placeholder="Search current table... (Ctrl+Shift+F)" autocomplete="off"><button id="sapClearSearch" type="button">Clear</button></div><div class="sap-exec-kpis"><span id="sapVisibleRows">Rows: --</span><span id="sapDataQuality">Quality: --</span><button id="sapRecentBtn" type="button">Recent</button><button id="sapQualityBtn" type="button">Data Check</button></div>`;
   anchor.insertAdjacentElement('afterend',bar);
   q('#sapGlobalTableSearch').addEventListener('input',applySearch);
   q('#sapClearSearch').onclick=()=>{q('#sapGlobalTableSearch').value='';applySearch()};
   q('#sapRecentBtn').onclick=showRecent;
   q('#sapQualityBtn').onclick=runQualityCheck;
 }
 function applySearch(){
   const table=activeTable(),input=q('#sapGlobalTableSearch');if(!table||!input){updateRows();return}
   const term=normalize(input.value);let shown=0;
   qa('tbody tr',table).forEach(r=>{const ok=!term||normalize(r.innerText).includes(term);r.classList.toggle('sap-search-hidden',!ok);if(ok)shown++});
   updateRows(shown);highlightMatches(term,table);
 }
 function highlightMatches(term,table){
   qa('tbody td',table).forEach(td=>{td.classList.remove('sap-search-match');if(term&&normalize(td.innerText).includes(term))td.classList.add('sap-search-match')});
 }
 function updateRows(forced){
   const table=activeTable();const total=table?qa('tbody tr',table).length:0;const visible=forced??(table?qa('tbody tr',table).filter(r=>!r.classList.contains('sap-search-hidden')).length:0);
   const el=q('#sapVisibleRows');if(el)el.textContent=`Rows: ${visible}/${total}`;
 }
 function rememberTransaction(page){
   const m=meta(page);let recent=JSON.parse(localStorage.getItem('sapRecentTransactions')||'[]');recent=recent.filter(x=>x.page!==page);recent.unshift({page,code:m[0],title:m[1],at:new Date().toISOString()});recent=recent.slice(0,8);localStorage.setItem('sapRecentTransactions',JSON.stringify(recent));
 }
 function showRecent(){
   q('.sap-recent-panel')?.remove();const recent=JSON.parse(localStorage.getItem('sapRecentTransactions')||'[]');const panel=document.createElement('div');panel.className='sap-recent-panel';
   panel.innerHTML=`<div class="sap-recent-head"><b>Recent Transactions</b><button type="button">×</button></div><div class="sap-recent-list">${recent.length?recent.map(x=>`<button type="button" data-page="${x.page}"><strong>${x.code}</strong><span>${x.title}</span><small>${new Date(x.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></button>`).join(''):'<p>No recent transactions.</p>'}</div>`;
   document.body.appendChild(panel);q('.sap-recent-head button',panel).onclick=()=>panel.remove();panel.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;panel.remove();if(typeof openPageByName==='function')openPageByName(b.dataset.page);else q(`.nav[data-page="${b.dataset.page}"]`)?.click()});
 }
 function runQualityCheck(){
   const table=activeTable();if(!table)return toast('Current screen par table nahi hai.','warning');
   const rows=qa('tbody tr',table);let blank=0,duplicate=0,invalidAmount=0;const seen=new Set();
   rows.forEach(r=>{r.classList.remove('sap-quality-warning');const cells=qa('td',r);let bad=false;const values=cells.map(c=>normalize(c.innerText));if(values.some(v=>v===''||v==='--'||v==='n/a')){blank++;bad=true}const key=values.slice(0,Math.min(3,values.length)).join('|');if(key&&seen.has(key)){duplicate++;bad=true}else if(key)seen.add(key);cells.forEach(c=>{const t=c.innerText.trim();if(/amount|debit|credit|balance/i.test(c.dataset.label||'')&&t&&!/^-?[\d,]+(\.\d+)?$/.test(t)){invalidAmount++;bad=true}});r.classList.toggle('sap-quality-warning',bad)});
   const score=Math.max(0,100-Math.min(100,(blank+duplicate+invalidAmount)*3));const el=q('#sapDataQuality');if(el)el.textContent=`Quality: ${score}%`;toast(`Data check complete — Blank: ${blank}, Duplicate: ${duplicate}, Invalid amount: ${invalidAmount}`,score>=90?'success':'warning');
 }
 function enableRowFocus(){
   const table=activeTable();if(!table)return;qa('tbody tr',table).forEach(r=>{if(r.dataset.sapFocusBound)return;r.dataset.sapFocusBound='1';r.tabIndex=0;r.addEventListener('click',()=>{qa('tbody tr',table).forEach(x=>x.classList.remove('sap-row-selected'));r.classList.add('sap-row-selected')});r.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();r.nextElementSibling?.focus()}if(e.key==='ArrowUp'){e.preventDefault();r.previousElementSibling?.focus()}})});
 }
 function transactionChanged(){buildExecutiveBar();const p=pageId();rememberTransaction(p);const input=q('#sapGlobalTableSearch');if(input)input.value='';setTimeout(()=>{applySearch();enableRowFocus();const el=q('#sapDataQuality');if(el)el.textContent='Quality: Ready'},140)}
 document.addEventListener('DOMContentLoaded',()=>{buildExecutiveBar();transactionChanged()});
 document.addEventListener('click',e=>{if(e.target.closest('.nav[data-page]'))setTimeout(transactionChanged,160)});
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='f'){e.preventDefault();q('#sapGlobalTableSearch')?.focus()}if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();showRecent()}if(e.altKey&&e.key.toLowerCase()==='q'){e.preventDefault();runQualityCheck()}});
 const observer=new MutationObserver(()=>{updateRows();enableRowFocus()});document.addEventListener('DOMContentLoaded',()=>{const main=q('.content')||document.body;observer.observe(main,{childList:true,subtree:true})});
})();


async function loadCashFlow(){if(!$('cashFlowBody'))return;const rows=await api('/api/accounts/cash-flow-forecast?days='+($('cfDays')?.value||30));let inflow=0,outflow=0;rows.forEach(r=>{inflow+=Number(r.projected_inflow||0);outflow+=Number(r.projected_outflow||0)});$('cfInflow').textContent=money(inflow);$('cfOutflow').textContent=money(outflow);$('cfClosing').textContent=money(rows.at(-1)?.closing||0);$('cashFlowBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${money(r.opening)}</td><td>${money(r.projected_inflow)}</td><td>${money(r.projected_outflow)}</td><td class="${r.closing<0?'amount-short':''}"><b>${money(r.closing)}</b></td><td><span class="status-chip ${r.risk==='Low Cash'?'short':'matched'}">${esc(r.risk)}</span></td></tr>`).join('')||'<tr><td colspan="6">No projection data</td></tr>'}
async function loadBudgetControl(){if(!$('budgetBody'))return;const period=$('budgetPeriod')?.value||new Date().toISOString().slice(0,7);if($('budgetPeriod')&&!$('budgetPeriod').value)$('budgetPeriod').value=period;const rows=await api('/api/accounts/budget-vs-actual?period='+period);$('budgetBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.period_key)}</td><td>${esc(r.cost_center)}</td><td>${esc(r.account_head)}</td><td>${money(r.budget_amount)}</td><td>${money(r.actual_amount)}</td><td class="${r.variance<0?'amount-short':''}">${money(r.variance)}</td><td><span class="status-chip ${r.variance<0?'short':'matched'}">${r.variance<0?'Over Budget':'Within Budget'}</span></td></tr>`).join('')||'<tr><td colspan="7">Budget enter karein</td></tr>'}
async function saveBudget(){try{await api('/api/accounts/budgets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period_key:$('budgetPeriod').value,account_head:$('budgetHead').value,cost_center:$('budgetCostCenter').value||'ALL',budget_amount:$('budgetAmount').value})});$('budgetAmount').value='';await loadBudgetControl()}catch(e){alert(e.message)}}
async function loadMonthEnd(){if(!$('monthEndBody'))return;const period=$('monthEndPeriod')?.value||new Date().toISOString().slice(0,7);if($('monthEndPeriod')&&!$('monthEndPeriod').value)$('monthEndPeriod').value=period;const rows=await api('/api/accounts/month-end-tasks?period='+period);const done=rows.filter(r=>r.status==='Completed').length;$('meTotal').textContent=rows.length;$('meDone').textContent=done;$('mePending').textContent=rows.length-done;$('monthEndBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.task_name)}</td><td>${esc(r.owner||'')}</td><td>${esc(r.due_date||'')}</td><td><span class="status-chip ${r.status==='Completed'?'matched':'pending'}">${esc(r.status)}</span></td><td>${esc(r.remarks||'')}</td><td>${esc(r.updated_by||'')}</td><td><button onclick="updateMonthEnd(${r.id},'${r.status==='Completed'?'Pending':'Completed'}')">${r.status==='Completed'?'Reopen':'Complete'}</button></td></tr>`).join('')}
async function updateMonthEnd(id,status){const remarks=prompt('Remarks (optional):','')||'';await api('/api/accounts/month-end-tasks/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,remarks})});loadMonthEnd()}
document.addEventListener('click',e=>{const p=e.target.closest('.nav')?.dataset.page;if(p==='cashFlow')setTimeout(loadCashFlow,50);if(p==='budgetControl')setTimeout(loadBudgetControl,50);if(p==='monthEnd')setTimeout(loadMonthEnd,50)});


function jvLineHtml(){return `<tr><td><input class="jv-code" placeholder="Code"></td><td><input class="jv-account" placeholder="Account name"></td><td><input class="jv-cost" value="ALL"></td><td><input class="jv-debit" type="number" step="0.01" min="0" value="0" oninput="calcJvTotals()"></td><td><input class="jv-credit" type="number" step="0.01" min="0" value="0" oninput="calcJvTotals()"></td><td><button class="danger" onclick="this.closest('tr').remove();calcJvTotals()">×</button></td></tr>`}
function addJvLine(){if(!$('jvLines'))return;$('jvLines').insertAdjacentHTML('beforeend',jvLineHtml());calcJvTotals()}
function calcJvTotals(){let d=0,c=0;document.querySelectorAll('#jvLines tr').forEach(r=>{d+=Number(r.querySelector('.jv-debit')?.value||0);c+=Number(r.querySelector('.jv-credit')?.value||0)});if($('jvDebitTotal'))$('jvDebitTotal').textContent=money(d);if($('jvCreditTotal'))$('jvCreditTotal').textContent=money(c);if($('jvDifference'))$('jvDifference').textContent='Diff '+money(d-c)}
async function loadJournalVouchers(){if(!$('jvHistory'))return;const period=$('jvPeriod')?.value||new Date().toISOString().slice(0,7);if($('jvPeriod')&&!$('jvPeriod').value)$('jvPeriod').value=period;if($('jvDate')&&!$('jvDate').value)$('jvDate').value=new Date().toISOString().slice(0,10);if(!$('jvLines').children.length){addJvLine();addJvLine()}const rows=await api('/api/accounts/journal-vouchers?period='+period);$('jvHistory').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.voucher_no)}</b></td><td>${esc(r.posting_date)}</td><td>${esc(r.narration||'')}</td><td>${r.line_count}</td><td>${money(r.total_debit)}</td><td>${money(r.total_credit)}</td><td><span class="status-chip matched">${esc(r.status)}</span></td><td>${esc(r.created_by||'')}</td></tr>`).join('')||'<tr><td colspan="8">No journal vouchers</td></tr>'}
async function postJournalVoucher(){const lines=[...document.querySelectorAll('#jvLines tr')].map(r=>({account_code:r.querySelector('.jv-code').value,account_name:r.querySelector('.jv-account').value,cost_center:r.querySelector('.jv-cost').value,debit:r.querySelector('.jv-debit').value,credit:r.querySelector('.jv-credit').value}));try{const res=await api('/api/accounts/journal-vouchers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({posting_date:$('jvDate').value,narration:$('jvNarration').value,lines})});alert('Posted: '+res.voucher_no);$('jvNarration').value='';$('jvLines').innerHTML='';addJvLine();addJvLine();loadJournalVouchers()}catch(e){alert(e.message)}}
async function loadTrialBalance(){if(!$('tbBody'))return;const period=$('tbPeriod')?.value||new Date().toISOString().slice(0,7);if($('tbPeriod')&&!$('tbPeriod').value)$('tbPeriod').value=period;const d=await api('/api/accounts/trial-balance?period='+period);$('tbDebit').textContent=money(d.total_debit);$('tbCredit').textContent=money(d.total_credit);$('tbDiff').textContent=money(d.total_debit-d.total_credit);$('tbBody').innerHTML=d.rows.map(r=>`<tr><td>${esc(r.account_name)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td class="${r.balance<0?'amount-short':''}"><b>${money(r.balance)}</b></td></tr>`).join('')||'<tr><td colspan="4">No ledger movement</td></tr>'}
async function loadAccruals(){if(!$('acBody'))return;const rows=await api('/api/accounts/accruals');$('acBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.schedule_type)}</td><td>${esc(r.reference_no||'')}</td><td>${esc(r.description)}</td><td>${esc(r.start_date)} to ${esc(r.end_date)}</td><td>${money(r.total_amount)}</td><td>${money(r.calculated_recognized)}</td><td>${money(r.outstanding)}</td><td>${esc(r.account_name||'')}</td><td>${esc(r.cost_center||'')}</td><td><span class="status-chip ${r.status==='Closed'?'matched':'pending'}">${r.status}</span></td></tr>`).join('')||'<tr><td colspan="10">No schedules</td></tr>'}
async function saveAccrual(){try{await api('/api/accounts/accruals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({schedule_type:$('acType').value,reference_no:$('acReference').value,description:$('acDescription').value,start_date:$('acStart').value,end_date:$('acEnd').value,total_amount:$('acAmount').value,account_name:$('acAccount').value,cost_center:$('acCostCenter').value})});$('acDescription').value='';$('acAmount').value='';loadAccruals()}catch(e){alert(e.message)}}
async function loadFixedAssets(){if(!$('faBody'))return;const rows=await api('/api/accounts/fixed-assets');$('faBody').innerHTML=rows.map(r=>`<tr><td><b>${esc(r.asset_code)}</b></td><td>${esc(r.asset_name)}</td><td>${esc(r.category||'')}</td><td>${esc(r.acquisition_date)}</td><td>${money(r.cost)}</td><td>${money(r.monthly_depreciation)}</td><td>${money(r.accumulated_depreciation)}</td><td><b>${money(r.net_book_value)}</b></td><td>${esc(r.location||'')}</td><td>${esc(r.custodian||'')}</td><td><span class="status-chip matched">${esc(r.status)}</span></td></tr>`).join('')||'<tr><td colspan="11">No fixed assets</td></tr>'}
async function saveFixedAsset(){try{await api('/api/accounts/fixed-assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({asset_code:$('faCode').value,asset_name:$('faName').value,category:$('faCategory').value,acquisition_date:$('faDate').value,cost:$('faCost').value,salvage_value:$('faSalvage').value,useful_life_months:$('faLife').value,location:$('faLocation').value,custodian:$('faCustodian').value})});$('faCode').value='';$('faName').value='';$('faCost').value='';loadFixedAssets()}catch(e){alert(e.message)}}
document.addEventListener('click',e=>{const p=e.target.closest('.nav')?.dataset.page;if(p==='journalVoucher')setTimeout(loadJournalVouchers,50);if(p==='trialBalance')setTimeout(loadTrialBalance,50);if(p==='accruals')setTimeout(loadAccruals,50);if(p==='fixedAssets')setTimeout(loadFixedAssets,50);if(p==='financeHealth')setTimeout(loadFinanceHealth,50);if(p==='financialStatements')setTimeout(loadFinancialStatements,50);if(p==='costCenters')setTimeout(loadCostCenters,50);if(p==='taxCenter')setTimeout(loadTaxRegister,50);if(p==='paymentCalendar')setTimeout(loadPaymentCalendar,50)});


async function loadFinanceHealth(){if(!$('fhScore'))return;const period=$('fhPeriod')?.value||new Date().toISOString().slice(0,7);if($('fhPeriod')&&!$('fhPeriod').value)$('fhPeriod').value=period;const d=await api('/api/accounts/finance-health?period='+period);$('fhScore').textContent=d.health_score+'%';$('fhCash').textContent=money(d.cash_position);$('fhReceivable').textContent=money(d.customer_receivable);$('fhPayable').textContent=money(d.vendor_payable);const signals=[['Reconciliation Exceptions',d.reconciliation_exceptions,d.reconciliation_exceptions?'critical':'cleared'],['Pending Approvals',d.pending_approvals,d.pending_approvals?'pending':'cleared'],['Overdue Payments',d.overdue_payments,d.overdue_payments?'critical':'cleared'],['Period Lock',d.period_locked?'Locked':'Open',d.period_locked?'cleared':'pending'],['Month-End Close',`${d.close_completed}/${d.close_total}`,d.close_total&&d.close_completed===d.close_total?'cleared':'pending']];$('fhSignals').innerHTML=signals.map(x=>`<div class="finance-signal ${x[2]}"><span>${esc(x[0])}</span><b>${esc(String(x[1]))}</b></div>`).join('')}
async function loadFinancialStatements(){if(!$('fsPnlBody'))return;const period=$('fsPeriod')?.value||new Date().toISOString().slice(0,7);if($('fsPeriod')&&!$('fsPeriod').value)$('fsPeriod').value=period;const d=await api('/api/accounts/financial-statements?period='+period);$('fsPnlBody').innerHTML=[...d.income.map(x=>`<tr><td>${esc(x.account)}</td><td>${money(x.amount)}</td></tr>`),...d.expenses.map(x=>`<tr><td>${esc(x.account)}</td><td>(${money(x.amount)})</td></tr>`)].join('')||'<tr><td colspan="2">No classified JV income/expense entries</td></tr>';$('fsProfit').textContent=money(d.net_profit);$('fsAssetsBody').innerHTML=d.assets.map(x=>`<tr><td>${esc(x.account)}</td><td>${money(x.amount)}</td></tr>`).join('');$('fsLiabilitiesBody').innerHTML=d.liabilities.map(x=>`<tr><td>${esc(x.account)}</td><td>${money(x.amount)}</td></tr>`).join('');$('fsAssetsTotal').textContent=money(d.total_assets);$('fsLiabilitiesTotal').textContent=money(d.total_liabilities)}
async function loadCostCenters(){if(!$('ccBody'))return;const period=$('ccPeriod')?.value||new Date().toISOString().slice(0,7);if($('ccPeriod')&&!$('ccPeriod').value)$('ccPeriod').value=period;const d=await api('/api/accounts/cost-centers?period='+period);$('ccBody').innerHTML=d.rows.map(x=>`<tr><td><b>${esc(x.cost_center)}</b></td><td>${x.entries}</td><td>${money(x.debit)}</td><td>${money(x.credit)}</td><td>${money(x.net)}</td></tr>`).join('')||'<tr><td colspan="5">No cost-center journal data</td></tr>'}
async function loadTaxRegister(){if(!$('txBody'))return;const period=$('txPeriod')?.value||new Date().toISOString().slice(0,7);if($('txPeriod')&&!$('txPeriod').value)$('txPeriod').value=period;if($('txDate')&&!$('txDate').value)$('txDate').value=new Date().toISOString().slice(0,10);const rows=await api('/api/accounts/tax-register?period='+period);$('txBody').innerHTML=rows.map(x=>`<tr><td>${esc(x.posting_date)}</td><td>${esc(x.tax_type)}</td><td>${esc((x.party_code||'')+' '+(x.party_name||''))}</td><td>${esc(x.document_number||'')}</td><td>${money(x.taxable_amount)}</td><td>${Number(x.tax_rate||0).toFixed(2)}%</td><td>${money(x.tax_amount)}</td><td><span class="status-chip">${esc(x.status)}</span></td></tr>`).join('')||'<tr><td colspan="8">No tax entries</td></tr>'}
async function saveTaxEntry(){try{await api('/api/accounts/tax-register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({posting_date:$('txDate').value,tax_type:$('txType').value,party_type:$('txPartyType').value,party_code:$('txPartyCode').value,party_name:$('txPartyName').value,document_number:$('txDoc').value,taxable_amount:$('txTaxable').value,tax_rate:$('txRate').value,status:$('txStatus').value})});alert('Tax entry saved');loadTaxRegister()}catch(e){alert(e.message)}}
async function loadPaymentCalendar(){if(!$('pyBody'))return;if($('pyDue')&&!$('pyDue').value)$('pyDue').value=new Date().toISOString().slice(0,10);const rows=await api('/api/accounts/payment-calendar');$('pyBody').innerHTML=rows.map(x=>{const days=Number(x.days_to_due);const cls=x.status==='Paid'?'cleared':days<0?'critical':days<=3?'pending':'';return `<tr class="${cls}"><td>${esc(x.due_date)}</td><td>${days}</td><td>${esc(x.priority)}</td><td>${esc((x.party_code||'')+' '+x.party_name)}</td><td>${esc(x.reference_no||'')}</td><td>${money(x.amount)}</td><td>${esc(x.payment_method||'')}</td><td>${esc(x.status)}</td><td>${x.status==='Paid'?'—':`<button onclick="updatePaymentStatus(${x.id},'Paid')">Mark Paid</button>`}</td></tr>`}).join('')||'<tr><td colspan="9">No planned payments</td></tr>'}
async function savePaymentPlan(){try{await api('/api/accounts/payment-calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({due_date:$('pyDue').value,party_type:$('pyPartyType').value,party_code:$('pyPartyCode').value,party_name:$('pyPartyName').value,reference_no:$('pyRef').value,amount:$('pyAmount').value,priority:$('pyPriority').value,payment_method:$('pyMethod').value})});alert('Payment plan added');loadPaymentCalendar()}catch(e){alert(e.message)}}
async function updatePaymentStatus(id,status){try{await api('/api/accounts/payment-calendar/'+id+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});loadPaymentCalendar()}catch(e){alert(e.message)}}
