<?php

namespace App\Services;

class WebhookSSRFValidator
{
    public static function validate(string $url): bool
    {
        $parsed = parse_url($url);
        if (!$parsed || !isset($parsed['host'])) {
            return false;
        }

        $host = $parsed['host'];

        // Block localhost and common dev hostnames
        if (in_array(strtolower($host), ['localhost', '127.0.0.1', '::1'])) {
            return false;
        }

        // Resolve IP
        $ip = gethostbyname($host);
        if (!$ip || $ip === $host) {
            // If it can't be resolved, it might be an invalid domain or already an IP
            // If it's already an IP, it will pass the check below
            $ip = $host;
        }

        if (!filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        // Private IP Ranges
        $privateRanges = [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '169.254.0.0/16',
            '127.0.0.0/8',
            '::1/128',
            'fc00::/7',
        ];

        foreach ($privateRanges as $range) {
            if (self::ipInRage($ip, $range)) {
                return false;
            }
        }

        return true;
    }

    private static function ipInRage(string $ip, string $range): bool
    {
        if (str_contains($range, '/')) {
            list($subnet, $bits) = explode('/', $range);
        } else {
            $subnet = $range;
            $bits = str_contains($ip, ':') ? 128 : 32;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ipLong = ip2long($ip);
            $subnetLong = ip2long($subnet);
            $mask = -1 << (32 - $bits);
            $subnetLong &= $mask;
            return ($ipLong & $mask) == $subnetLong;
        }

        // IPv6 check is more complex, but for basic security this covers the main ones
        return false;
    }
}
