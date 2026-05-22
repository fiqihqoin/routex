<?php

// Suppress PHP 8.5 deprecation warnings globally (Web & CLI)
error_reporting(E_ALL & ~E_DEPRECATED);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Trust all proxies (untuk NGINX reverse proxy)
        $middleware->trustProxies(at: '*');
        
        $middleware->validateCsrfTokens(except: [
            'api/portal/*',
        ]);

        $middleware->redirectTo(
            guests: function (Request $request) {
                if ($request->is('admin') || $request->is('admin/*')) {
                    return route('filament.admin.auth.login');
                }
                return '/login';
            },
            users: '/portal'
        );
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
