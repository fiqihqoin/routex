<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { margin: 20px 0; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .credentials { background-color: #f8fafc; border-left: 4px solid #64748b; }
        .sandbox { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
        .production { background-color: #f0fdfa; border-left: 4px solid #00d4aa; }
        .key-box { background-color: #1a202c; color: #fff; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; word-break: break-all; margin: 10px 0; }
        .warning { color: #dc2626; font-weight: bold; font-size: 13px; margin-top: 15px; padding: 10px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #00d4aa; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .endpoint { font-size: 12px; color: #64748b; font-family: monospace; }
        .label { font-weight: bold; color: #475569; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Selamat Datang di CaishenEngine!</h2>
        <p>Halo {{ $user->name }},</p>
        <p>Akun merchant untuk <strong>{{ $user->company_name }}</strong> telah berhasil didaftarkan oleh Admin. Berikut adalah kredensial login dan API Keys Anda.</p>

        <h3>🔐 Login Kredensial</h3>
        <div class="card credentials">
            <p><span class="label">Email:</span> {{ $user->email }}</p>
            <p><span class="label">Password:</span> <code style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px;">{{ $password }}</code></p>
            <p style="font-size: 12px; color: #64748b;">*Mohon segera ganti password Anda setelah login pertama kali.</p>
        </div>

        <h3>🔑 API Keys</h3>
        <p>Gunakan API Keys di bawah ini untuk mulai integrasi.</p>

        <!-- Sandbox Section -->
        <div class="card sandbox">
            <h4 style="margin-top:0; color: #92400e;">🧪 Sandbox Environment</h4>
            <div class="key-box">{{ $sandboxApiKey }}</div>
            <div class="endpoint">Endpoint: https://sandbox.caishenengine.id/api/v1</div>
        </div>

        <!-- Production Section -->
        <div class="card production">
            <h4 style="margin-top:0; color: #0d9488;">🚀 Production Environment</h4>
            <div class="key-box">{{ $productionApiKey }}</div>
            <div class="endpoint">Endpoint: https://api.caishenengine.id/api/v1</div>
        </div>

        <div class="warning">
            ⚠️ PENTING: Simpan kredensial dan API Keys ini di tempat yang aman. Untuk alasan keamanan, API Keys ini hanya dikirimkan sekali melalui email ini.
        </div>

        <center>
            <a href="https://portal.caishenengine.id/login" class="btn">Login ke Portal &rarr;</a>
        </center>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 40px 0 20px;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            CaishenEngine — Intelligent QRIS Payment Routing<br>
            Jl. HR Rasuna Said, Jakarta, Indonesia
        </p>
    </div>
</body>
</html>
