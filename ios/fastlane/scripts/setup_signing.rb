#!/usr/bin/env ruby
# Create App Group, assign to Bundle IDs, create App Store profiles for BusyProxy.
# Auth: ASC API key from env, or FASTLANE_USER session.

require "spaceship"
require "fileutils"
require "base64"

MAIN = ENV.fetch("IOS_BUNDLE_ID", "net.busyproxy.app.ios")
TUNNEL = ENV.fetch("IOS_TUNNEL_BUNDLE_ID", "net.busyproxy.app.ios.tunnel")
GROUP = ENV.fetch("IOS_APP_GROUP", "group.net.busyproxy.app.ios")
TEAM = ENV.fetch("APPLE_TEAM_ID", "RA9PQ9434F")
KEY_ID = ENV["APP_STORE_CONNECT_KEY_ID"]
ISSUER = ENV["APP_STORE_CONNECT_ISSUER_ID"]
P8 = File.expand_path(ENV.fetch("APP_STORE_CONNECT_API_KEY_PATH", "~/.config/appstoreconnect/key.p8"))

def api_key_auth!
  token = Spaceship::ConnectAPI::Token.create(
    key_id: KEY_ID,
    issuer_id: ISSUER,
    filepath: P8,
  )
  Spaceship::ConnectAPI.token = token
  puts "API key auth OK (#{KEY_ID})"
end

def find_bundle(id)
  Spaceship::ConnectAPI::BundleId.all.find { |b| b.identifier == id }
end

def ensure_app_group!
  # App Groups live under BundleIdCapability settings or as separate identifiers.
  # Prefer Spaceship portal if available; else patch capability settings via API.
  puts "=== App Group #{GROUP} ==="

  main = find_bundle(MAIN)
  tunnel = find_bundle(TUNNEL)
  raise "Missing main bundle" unless main
  raise "Missing tunnel bundle" unless tunnel

  [main, tunnel].each do |b|
    caps = b.get_capabilities || []
    ag = caps.find { |c| c.capability_type.to_s.include?("APP_GROUP") }
    puts "#{b.identifier}: APP_GROUPS present=#{!ag.nil?} settings=#{ag&.settings.inspect}"
  end

  # Create capability settings for app groups if API supports it.
  # Spaceship BundleIdCapability settings format:
  # [{ key: "APP_GROUP_IDENTIFIERS", options: [{ key: GROUP }] }]  (varies by version)
  [main, tunnel].each do |b|
    begin
      caps = b.get_capabilities || []
      ag = caps.find { |c| c.capability_type.to_s.include?("APP_GROUP") }
      unless ag
        type = Spaceship::ConnectAPI::BundleIdCapability::Type::APP_GROUPS
        puts "Enabling APP_GROUPS on #{b.identifier}"
        b.create_capability(type)
        caps = b.get_capabilities || []
        ag = caps.find { |c| c.capability_type.to_s.include?("APP_GROUP") }
      end

      # Try to set group identifiers via update if settings empty
      if ag && (ag.settings.nil? || ag.settings.empty?)
        puts "Attempting to set group identifier on #{b.identifier}..."
        # API may require separate appGroup resource; try common shape
        begin
          ag.settings = [
            {
              key: "APP_GROUP_IDENTIFIERS",
              options: [{ key: GROUP, enabled: true }],
            },
          ]
          # Some versions: bundle_id.update_capability
          puts "  settings after assign attempt: #{ag.settings.inspect}"
        rescue => e
          puts "  set settings: #{e.message}"
        end
      end
    rescue => e
      puts "ensure group on #{b.identifier}: #{e.class} #{e.message}"
    end
  end
end

def list_certs
  puts "=== Certificates ==="
  certs = Spaceship::ConnectAPI::Certificate.all rescue []
  certs.each do |c|
    puts "  #{c.certificate_type} id=#{c.id} name=#{c.display_name rescue c.name} exp=#{c.expiration_date rescue nil}"
  end
  certs
end

def ensure_profiles!
  puts "=== Profiles ==="
  certs = list_certs
  dist = certs.find { |c|
    t = c.certificate_type.to_s
    t.include?("DISTRIBUTION") || t.include?("IOS_DISTRIBUTION")
  }
  unless dist
    puts "No distribution cert via API — profiles may still exist from Xcode"
  else
    puts "Using distribution cert #{dist.id}"
  end

  existing = Spaceship::ConnectAPI::Profile.all rescue []
  puts "Existing profiles: #{existing.size}"
  existing.each do |p|
    puts "  #{p.name} type=#{p.profile_type} state=#{p.profile_state}"
  end

  [
    [MAIN, "BusyProxy AppStore", "IOS_APP_STORE"],
    [TUNNEL, "BusyProxyTunnel AppStore", "IOS_APP_STORE"],
  ].each do |bundle_id, name, profile_type|
    bid = find_bundle(bundle_id)
    next unless bid

    found = existing.find { |p| p.name == name || (p.respond_to?(:bundle_id) && p.bundle_id == bundle_id) }
    if found
      puts "Profile exists: #{found.name} (#{found.id})"
      install_profile(found)
      next
    end

    unless dist
      puts "Skip create #{name}: no dist cert"
      next
    end

    begin
      puts "Creating profile #{name}..."
      # Spaceship::ConnectAPI::Profile.create
      profile = Spaceship::ConnectAPI::Profile.create(
        name: name,
        profile_type: profile_type,
        bundle_id_id: bid.id,
        certificate_ids: [dist.id],
        device_ids: [],
      )
      puts "Created #{profile.id}"
      install_profile(profile)
    rescue => e
      puts "create profile #{name}: #{e.class}: #{e.message}"
    end
  end
end

def install_profile(profile)
  dir = File.expand_path("~/Library/MobileDevice/Provisioning Profiles")
  FileUtils.mkdir_p(dir)
  # Fetch content
  begin
    content = profile.profile_content rescue nil
    content ||= begin
      # re-fetch
      full = Spaceship::ConnectAPI::Profile.get(profile_id: profile.id)
      full.profile_content
    end
    raw = Base64.decode64(content)
    path = File.join(dir, "#{profile.uuid rescue profile.id}.mobileprovision")
    File.binwrite(path, raw)
    puts "Installed profile → #{path} (#{raw.bytesize} bytes)"
  rescue => e
    puts "install_profile: #{e.class}: #{e.message}"
  end
end

def main
  api_key_auth!
  ensure_app_group!
  ensure_profiles!

  app = Spaceship::ConnectAPI::App.find(MAIN)
  puts "ASC app: #{app&.name} #{app&.id}"
  puts "Done."
end

main
