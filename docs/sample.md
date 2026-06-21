---

🛡️ Web Pentest Report 

Target: JDIH Banjarnegara (Laravel 12) 
Total Findings: 14 vulnerabilities
- 🔴 High
- 🟡 Medium
- 🔵 Low

---

🔴 HIGH SEVERITY

JDIIH-001: SSRF via OpenSID Proxy Endpoint ✅ CONFIRMED Lokasi: ProdukHukumDesaController.php:40-114 CWE: CWE-918

Root Cause: Proxy endpoint menerima url parameter yang divalidasi dengan cek database ATAU suffix .desa.id. Fallback validation mengizinkan SEMUA domain .desa.id tanpa DNS resolution check, plus verify => false (SSL disabled).

Impact: Internal network scanning, cloud metadata access, protocol smuggling (gopher://, file://)

Proof of Concept:
curl "https://jdih.banjarkab.go.id/api/produk-hukum-desa?url=http://127.0.0.1:6379&endpoint=/INFO"
curl "https://jdih.banjarkab.go.id/api/produk-hukum-desa?url=http://169.254.169.254&endpoint=/latest/meta-data/"


Fix: Implement DNS resolution + IP blocking, enable SSL verification, strict allowlist.
---

🟡 MEDIUM SEVERITY

JDIIH-002: IDOR di Filament Admin Resources
Lokasi: 22 Filament Resources (tidak ada authorizeView/authorizeEdit/authorizeDelete)
CWE: CWE-639

Bukti: Semua resource tidak punya authorization methods. Admin bisa akses document manapun dengan ganti ID di URL:
/admin/legal-documents/1/view → Document A
/admin/legal-documents/2/view → Document B (IDOR)


---

JDIIH-003: XSS via dangerouslySetInnerHTML
Lokasi: DaftarDokumen.tsx:222
CWE: CWE-79

Bukti:
dangerouslySetInnerHTML={{ __html: link.label }}

link.label dari pagination — secara umum aman (angka/Next/Previous), tapi secara teoretis bisa dieksploitasi jika custom paginator.

---