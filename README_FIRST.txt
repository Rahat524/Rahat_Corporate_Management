CORPORATE CUSTOMER + SCRAP VENDOR MANAGEMENT SYSTEM

RUN
1. Extract ZIP to Desktop.
2. Double-click START_SOFTWARE.bat.
3. First run installs Flask and openpyxl.
4. Browser opens at http://127.0.0.1:5055

LOGIN
Username: Rahat
Password: Rahat@0031

MOBILE
Keep the black server window open.
Computer and mobile must use the same Wi-Fi.
Open Settings to see the mobile URL.

MODULES
- Corporate Customer Master and Audit Ledger
- Duplicate Document Sheet
- Corporate Excel Import (duplicates auto-separated)
- Scrap Vendor Master
- Vendor Security Deposit and Advance
- Vendor Ledger with Debit/Credit
- Payment Status, Gate Pass and Bilty Tracking
- Excel Export
- Database Backup and Restore


INTERNET / REMOTE MOBILE ACCESS
- Same Wi-Fi is not required when using Cloudflare Tunnel.
- Install cloudflared, then double-click START_ONLINE_ACCESS.bat.
- Copy the generated https://....trycloudflare.com link.
- Open that link on any mobile internet connection.
- Keep the PC, server window, and tunnel window running.
- Quick Tunnel links are temporary and change each time.
- For a permanent production link, create a named Cloudflare Tunnel/domain.


PERMANENT ONLINE LINK — ONE-TIME SETUP
1. You need a Cloudflare account and a domain managed in Cloudflare.
2. In Cloudflare Dashboard, create a Tunnel named Rahat-Corporate.
3. Add a Public Hostname and set the service URL to http://localhost:5055.
4. Copy the Windows connector token.
5. Run SETUP_PERMANENT_ONLINE.bat and paste the token once.
6. Later, run START_PERMANENT_ONLINE.bat only.
7. Your configured hostname stays the same; it does not change every time.

SECURITY
- cloudflare_token.txt is a secret. Do not share it.
- Keep the computer and tunnel running while using the system remotely.
- START_TEMPORARY_ONLINE_ACCESS.bat is only for a changing test link.
