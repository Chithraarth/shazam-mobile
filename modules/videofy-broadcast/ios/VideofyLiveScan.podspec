Pod::Spec.new do |s|
  s.name           = 'VideofyLiveScan'
  s.version        = '1.0.0'
  s.summary        = 'Background screen scan for Videofy'
  s.description    = 'Starts the ReplayKit broadcast extension and shares the session with it'
  s.license        = 'UNLICENSED'
  s.author         = 'Videofy'
  s.homepage       = 'https://videofy.co.in'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ReplayKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
  s.source_files = "**/*.{h,m,swift}"
end
