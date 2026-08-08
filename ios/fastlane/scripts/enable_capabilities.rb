#!/usr/bin/env ruby
# Enable App Groups + Network Extensions on BusyProxy App IDs via App Store Connect API.
# Requires: APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_API_KEY_PATH
# Team: RA9PQ9434F

require "spaceship"

KEY_ID = ENV.fetch("APP_STORE_CONNECT_KEY_ID")
ISSUER = ENV.fetch("APP_STORE_CONNECT_ISSUER_ID")
P8 = File.expand_path(ENV.fetch("APP_STORE_CONNECT_API_KEY_PATH", "~/.config/appstoreconnect/key.p8"))
MAIN = ENV.fetch("IOS_BUNDLE_ID", "net.busyproxy.app.ios")
TUNNEL = ENV.fetch("IOS_TUNNEL_BUNDLE_ID", "net.busyproxy.app.ios.tunnel")
GROUP = ENV.fetch("IOS_APP_GROUP", "group.net.busyproxy.app.ios")
TEAM = ENV.fetch("APPLE_TEAM_ID", "RA9PQ9434F")

token = Spaceship::ConnectAPI::Token.create(
  key_id: KEY_ID,
  issuer_id: ISSUER,
  filepath: P8,
)
Spaceship::ConnectAPI.token = token

def ensure_bundle_id(identifier, name)
  existing = Spaceship::ConnectAPI::BundleId.all.find { |b| b.identifier == identifier }
  if existing
    puts "BundleId exists: #{identifier} (#{existing.id})"
    return existing
  end
  puts "Creating BundleId #{identifier}..."
  Spaceship::ConnectAPI::BundleId.create(
    name: name,
    platform: Spaceship::ConnectAPI::BundleIdPlatform::IOS,
    identifier: identifier,
  )
rescue => e
  puts "ensure_bundle_id #{identifier}: #{e.class} #{e.message}"
  Spaceship::ConnectAPI::BundleId.all.find { |b| b.identifier == identifier }
end

def enable_caps(bundle_id)
  return unless bundle_id

  # Fetch capabilities
  caps = bundle_id.get_capabilities || []
  types = caps.map { |c| c.capability_type rescue c.type rescue c["capabilityType"] }
  puts "  current caps: #{types.inspect}"

  wanted = []
  # Spaceship constant names vary by version — try several
  [
    ["APP_GROUPS", "APP_GROUP"],
    ["NETWORK_EXTENSIONS", "NETWORK_EXTENSION"],
  ].each do |candidates|
    const = candidates.map { |n|
      Spaceship::ConnectAPI::BundleIdCapability::Type.const_get(n) rescue nil
    }.compact.first
    wanted << const if const
  end

  wanted.each do |cap_type|
    begin
      already = caps.any? { |c|
        t = (c.capability_type rescue c.type rescue nil)
        t.to_s == cap_type.to_s
      }
      if already
        puts "  already: #{cap_type}"
        next
      end
      puts "  enabling: #{cap_type}"
      bundle_id.create_capability(cap_type)
    rescue => e
      puts "  enable #{cap_type} failed: #{e.message}"
    end
  end
end

main = ensure_bundle_id(MAIN, "BusyProxy")
tunnel = ensure_bundle_id(TUNNEL, "BusyProxy Tunnel")
enable_caps(main)
enable_caps(tunnel)

# Ensure ASC App record
begin
  app = Spaceship::ConnectAPI::App.find(MAIN)
  if app
    puts "ASC app exists: #{app.name} (#{app.id})"
  else
    puts "Creating ASC App for #{MAIN}..."
    Spaceship::ConnectAPI::App.create(
      name: "BusyProxy",
      primary_locale: "en-US",
      version_string: "1.0.0",
      sku: "busyproxy-ios-#{Time.now.to_i}",
      bundle_id: MAIN,
    )
    puts "ASC app created"
  end
rescue => e
  puts "ASC app: #{e.class} #{e.message}"
end

puts "Done. If Network Extension still fails signing, enable capabilities manually:"
puts "  developer.apple.com → Identifiers → #{MAIN} / #{TUNNEL}"
puts "  → App Groups: #{GROUP}"
puts "  → Network Extensions: Packet Tunnel"
puts "  → regenerate provisioning (Xcode automatic signing with -allowProvisioningUpdates)"
