#!/usr/bin/env ruby
require 'json'
require 'fileutils'

def get_deps(gem_dir)
  deps = []
  # Find gemspec files
  Dir.glob(File.join(gem_dir, 'specifications', '*.gemspec')).each do |spec_file|
    begin
      content = File.read(spec_file)
      # Parse runtime dependencies from gemspec
      content.scan(/s\.add_runtime_dependency\s*\(\s*["']([^"']+)["']/).each do |match|
        deps << match[0]
      end
      content.scan(/s\.add_dependency\s*\(\s*["']([^"']+)["']/).each do |match|
        deps << match[0]
      end
    rescue => e
      # Skip on error
    end
  end
  deps.uniq
end

def get_top_level(gem_dir)
  top_level = []
  gems_path = File.join(gem_dir, 'gems')
  return top_level unless Dir.exist?(gems_path)

  Dir.entries(gems_path).each do |entry|
    next if entry.start_with?('.')
    # Extract gem name from directory (format: gemname-version)
    if match = entry.match(/^(.+)-[\d.]+$/)
      top_level << match[1]
    end
  end
  top_level.uniq
end

def f(event)
  pkg = event['Pkg']
  already_installed = event['AlreadyInstalled']

  unless already_installed
    begin
      gem_dir = '/host/files'
      FileUtils.mkdir_p(gem_dir)
      system("gem install #{pkg} --install-dir #{gem_dir} --no-document --no-user-install")
    rescue => e
      STDERR.puts "gem install failed: #{e.message}"
    end
  end

  deps = get_deps('/host/files')
  top_level = get_top_level('/host/files')

  { 'Deps' => deps, 'TopLevel' => top_level }
end

# Read request from stdin and process
begin
  input = STDIN.read
  event = JSON.parse(input)
  result = f(event)
  puts result.to_json
rescue => e
  STDERR.puts "Error processing request: #{e.message}"
  exit 1
end
