<p>Hei {{ $merchant->name }},</p>

<p>Kamu baru saja request untuk mengganti email akun CaishenEngine ke alamat ini.</p>

<p>Silakan klik link di bawah ini untuk memverifikasi email baru kamu:</p>

<p><a href="{{ config('app.url') }}/portal/profile/email/verify/{{ $token }}">{{ config('app.url') }}/portal/profile/email/verify/{{ $token }}</a></p>

<p>Link ini berlaku 24 jam.</p>

<p><strong>Warning:</strong> Jika kamu tidak melakukan request ini, abaikan email ini. Email kamu tidak akan berubah.</p>

<p>Salam,<br>Tim CaishenEngine</p>
