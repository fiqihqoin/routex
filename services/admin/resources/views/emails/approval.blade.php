<!DOCTYPE html>
<html>
<body>
    <h2>Selamat {{ $user->name }}!</h2>
    <p>Akun Routex kamu sudah aktif dan siap digunakan.</p>

    <h3>📌 API Keys</h3>
    <p>Kamu mendapatkan DUA API key untuk environment berbeda:</p>

    <!-- Sandbox API Key -->
    <div style="margin: 20px 0; padding: 15px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #92400E;">🧪 Sandbox API Key (untuk testing)</h4>
        <pre style="background-color: #FFFBEB; padding: 12px; border-radius: 4px; font-weight: bold; overflow-x: auto;"><code>{{ $sandboxApiKey }}</code></pre>
        <p style="margin-bottom: 0; font-size: 14px; color: #78350F;">
            <strong>Endpoint:</strong> <code>https://sandbox.routex.id/api/v1</code>
        </p>
    </div>

    <!-- Production API Key -->
    <div style="margin: 20px 0; padding: 15px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #1E40AF;">🚀 Production API Key (untuk transaksi real)</h4>
        <pre style="background-color: #EFF6FF; padding: 12px; border-radius: 4px; font-weight: bold; overflow-x: auto;"><code>{{ $productionApiKey }}</code></pre>
        <p style="font-size: 14px; color: #1E3A8A;">
            <strong>Endpoint:</strong> <code>https://api.routex.id/api/v1</code>
        </p>
        <div style="background-color: #FEE2E2; border: 2px solid #DC2626; padding: 10px; border-radius: 4px; margin-top: 10px;">
            <p style="margin: 0; color: #991B1B; font-weight: bold;">
                ⚠️ PERINGATAN: Jangan share production key ini. Transaksi menggunakan key ini akan memproses uang sungguhan.
            </p>
        </div>
    </div>

    <h3>Cara Memulai:</h3>
    <ol>
        <li>Mulai dengan <strong>Sandbox API Key</strong> untuk testing integrasi</li>
        <li>Login ke <a href="{{ url('/portal/login') }}">Portal Routex</a></li>
        <li>Buka menu <strong>Vendors</strong> untuk konfigurasi provider (Midtrans/Xendit/Qoinhub)</li>
        <li>Test API menggunakan sandbox endpoint</li>
        <li>Setelah yakin, gunakan <strong>Production API Key</strong> untuk transaksi real</li>
        <li>Baca <a href="https://docs.routex.id">Dokumentasi API</a> untuk integrasi teknis lengkap</li>
    </ol>

    <p>Jika ada kendala, jangan ragu untuk membalas email ini.</p>
    <br>
    <p>Selamat bertransaksi!<br>Tim Routex</p>
</body>
</html>
