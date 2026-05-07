<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\PtmsUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PortalLoginController extends Controller
{
    public function create()
    {
        return view('portal.auth.login');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = PtmsUser::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [trans('auth.failed')],
            ]);
        }

        switch ($user->status) {
            case 'pending_verification':
                throw ValidationException::withMessages([
                    'email' => ['Silakan verifikasi email dulu'],
                ]);
            case 'pending_approval':
                throw ValidationException::withMessages([
                    'email' => ['Akun sedang menunggu persetujuan admin'],
                ]);
            case 'rejected':
                throw ValidationException::withMessages([
                    'email' => ['Akun ditolak. Hubungi support'],
                ]);
            case 'active':
                break;
            default:
                throw ValidationException::withMessages([
                    'email' => ['Status akun tidak dikenal.'],
                ]);
        }

        if (Auth::guard('portal')->login($user)) {
            $request->session()->regenerate();
            return redirect()->intended('/portal/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => [trans('auth.failed')],
        ]);
    }

    public function destroy(Request $request)
    {
        Auth::guard('portal')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/portal/login');
    }
}
