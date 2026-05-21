<p>Hei {{ $merchant->name }},</p>

<p>Password akun CaishenEngine kamu baru saja diubah pada {{ now()->format('d M Y, H:i') }} WIB.</p>

<p>Semua sesi aktif di perangkat lain telah dinonaktifkan.</p>

<div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0;">
    <p><strong>Jika kamu tidak melakukan perubahan ini</strong>, segera hubungi <a href="mailto:support@caishenengine.id">support@caishenengine.id</a> dan ganti password kamu sekarang.</p>
</div>

<p><a href="{{ url('/portal/profile') }}">Ganti Password →</a></p>

<p>Salam,<br>Tim CaishenEngine</p>
