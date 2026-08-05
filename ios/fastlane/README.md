fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios ios_whoami

```sh
[bundle exec] fastlane ios ios_whoami
```

Show Fastlane version, Apple user, team, signing identities

### ios build_sim

```sh
[bundle exec] fastlane ios build_sim
```

Build for iOS Simulator (no Apple ID required)

### ios certs_dev

```sh
[bundle exec] fastlane ios certs_dev
```

Register / update development signing (needs Apple ID + Team)

### ios build_device

```sh
[bundle exec] fastlane ios build_device
```

Build device IPA/app with automatic signing (needs Team + certs)

### ios open_xcode

```sh
[bundle exec] fastlane ios open_xcode
```

Open Xcode so you can pick the other Apple account Team in UI

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
