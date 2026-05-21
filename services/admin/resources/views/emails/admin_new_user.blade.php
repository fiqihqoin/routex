<!DOCTYPE html>
<html>
<body>
    <h2>Admin Alert: Pendaftaran Merchant Baru</h2>
    <p>Ada merchant baru yang telah memverifikasi email dan menunggu persetujuan:</p>
    
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Nama Merchant</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">{{ $user->name }}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Email</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">{{ $user->email }}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Nama Perusahaan</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">{{ $user->company_name }}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Use Case</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">{{ $user->use_case }}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB; font-weight: bold;">Expected Volume</td>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">IDR {{ number_format($user->expected_monthly_volume, 0, ',', '.') }}</td>
        </tr>
    </table>
    
    <p style="margin-top: 20px;">
        <a href="{{ url('/admin/merchants/' . $user->id . '/edit') }}" 
           style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Lihat & Approve di Dashboard
        </a>
    </p>
    
    <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">Ini adalah email otomatis sistem CaishenEngine.</p>
</body>
</html>
