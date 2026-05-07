package security

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

var privateIPBlocks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",    // IPv4 loopback
		"10.0.0.0/8",     // RFC1918
		"172.16.0.0/12",  // RFC1918
		"192.168.0.0/16", // RFC1918
		"169.254.0.0/16", // RFC3927 link-local
		"::1/128",        // IPv6 loopback
		"fe80::/10",      // IPv6 link-local
		"fc00::/7",       // IPv6 unique local addr
	} {
		_, block, _ := net.ParseCIDR(cidr)
		privateIPBlocks = append(privateIPBlocks, block)
	}
}

func IsPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

func ValidateCallbackURL(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format")
	}

	// 1. HTTPS only
	if u.Scheme != "https" {
		return fmt.Errorf("URL scheme must be HTTPS")
	}

	// 2. No localhost or internal hostnames
	host := u.Hostname()
	if host == "localhost" || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") {
		return fmt.Errorf("internal hostnames are blocked")
	}

	// 3. DNS Resolution check
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("could not resolve hostname")
	}

	// 4. Block private IP ranges
	for _, ip := range ips {
		if IsPrivateIP(ip) {
			return fmt.Errorf("callback URL resolves to a private IP address")
		}
	}

	return nil
}
