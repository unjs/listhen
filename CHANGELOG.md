# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.3.3](https://github.com/unjs/listhen/compare/v0.3.2...v0.3.3) (2022-09-20)


### Bug Fixes

* narrow down listener.https type ([c8279e2](https://github.com/unjs/listhen/commit/c8279e230865236781e428ece49c01fe523f90b7))

### [0.3.2](https://github.com/unjs/listhen/compare/v0.3.1...v0.3.2) (2022-09-20)


### Features

* expose resolve https options ([84023f4](https://github.com/unjs/listhen/commit/84023f471635fd76696f62a66b2d22534c4194aa))


### Bug Fixes

* display provided hostname ([ee1df6d](https://github.com/unjs/listhen/commit/ee1df6d622f172a351e897db7597f1c62a47a8cd))

### [0.3.1](https://github.com/unjs/listhen/compare/v0.3.0...v0.3.1) (2022-09-15)


### Features

* ipv6 support ([eb9f5ef](https://github.com/unjs/listhen/commit/eb9f5ef436be6dc0242bcf2f560c7713fcda736f))

## [0.3.0](https://github.com/unjs/listhen/compare/v0.2.15...v0.3.0) (2022-09-15)


### ⚠ BREAKING CHANGES

* `certificate` and `selfsigned` options are merged with `https`

### Features

* improved ssl support ([71256e6](https://github.com/unjs/listhen/commit/71256e6980af11c510c2bcde72534bb400a37098))

### [0.2.15](https://github.com/unjs/listhen/compare/v0.2.14...v0.2.15) (2022-08-08)


### Bug Fixes

* **deps:** update get-port please ([d0267d8](https://github.com/unjs/listhen/commit/d0267d8008f2bc0b97bfa3273f1ac8b5c6f2b8c4))

### [0.2.14](https://github.com/unjs/listhen/compare/v0.2.13...v0.2.14) (2022-08-08)


### Features

* update ger-port-please with verbose error ([8e6f023](https://github.com/unjs/listhen/commit/8e6f023489a58929dcf88c35d1cc26731727a9fb))


### Bug Fixes

* pass hostname to `getPort` as well ([#34](https://github.com/unjs/listhen/issues/34)) ([0ced0a4](https://github.com/unjs/listhen/commit/0ced0a46937ff8d19613ff9905f078a6b0643d5c))

### [0.2.13](https://github.com/unjs/listhen/compare/v0.2.12...v0.2.13) (2022-06-15)


### Bug Fixes

* avoid double `//` at end of url ([#30](https://github.com/unjs/listhen/issues/30)) ([2322064](https://github.com/unjs/listhen/commit/23220641333237a2b8df8983ed33ec4231386557))

### [0.2.12](https://github.com/unjs/listhen/compare/v0.2.11...v0.2.12) (2022-06-13)


### Features

* option to show baseURL in `showURL` ([#28](https://github.com/unjs/listhen/issues/28)) ([4ce9347](https://github.com/unjs/listhen/commit/4ce93479f2767647cd7b2fb68ed7e2923f245b19))

### [0.2.11](https://github.com/unjs/listhen/compare/v0.2.10...v0.2.11) (2022-04-25)


### Bug Fixes

* properly invoke isWsl as a function ([#22](https://github.com/unjs/listhen/issues/22)) ([2951376](https://github.com/unjs/listhen/commit/295137644b50f8d3a909091f88bdcb232d060157)), closes [nuxt/framework#4495](https://github.com/nuxt/framework/issues/4495)

### [0.2.10](https://github.com/unjs/listhen/compare/v0.2.9...v0.2.10) (2022-04-16)


### Bug Fixes

* bundle `xdg-open` as an async chunk ([890a4a9](https://github.com/unjs/listhen/commit/890a4a9b2569401b86e14b85e2d0b1d6d0e91d7e))

### [0.2.9](https://github.com/unjs/listhen/compare/v0.2.8...v0.2.9) (2022-04-15)


### Bug Fixes

* inline `open` package for esm bundling support ([3c2948f](https://github.com/unjs/listhen/commit/3c2948f7432fb29c7cb9d020c20a7bb5cd83b253)), closes [nuxt/framework#4352](https://github.com/nuxt/framework/issues/4352)
* use `options.hostname` for listening ([#19](https://github.com/unjs/listhen/issues/19)) ([10164d5](https://github.com/unjs/listhen/commit/10164d5931fd5511298f84b0f786dcdc2138856a))

### [0.2.8](https://github.com/unjs/listhen/compare/v0.2.7...v0.2.8) (2022-04-07)

### [0.2.7](https://github.com/unjs/listhen/compare/v0.2.6...v0.2.7) (2022-04-07)


### Bug Fixes

* update ssl keySize to 2048 ([f63967b](https://github.com/unjs/listhen/commit/f63967bfee8444f1d72c86d3e995d7be01e3279c))

### [0.2.6](https://github.com/unjs/listhen/compare/v0.2.5...v0.2.6) (2022-01-13)


### Features

* update dependencies ([4a25d12](https://github.com/unjs/listhen/commit/4a25d12906de30fa077ad9bdf6a208027deff85a))

### [0.2.5](https://github.com/unjs/listhen/compare/v0.2.4...v0.2.5) (2021-10-14)


### Bug Fixes

* use defu for defaults ([f866a61](https://github.com/unjs/listhen/commit/f866a6134f068bda1e20619a896a2b792c96e315))

### [0.2.4](https://github.com/unjs/listhen/compare/v0.2.3...v0.2.4) (2021-04-13)


### Features

* allow recalling showURL ([cd00e79](https://github.com/unjs/listhen/commit/cd00e7911f35773ff4904b73e6fcd8ef36044f50))

### [0.2.3](https://github.com/unjs/listhen/compare/v0.2.2...v0.2.3) (2021-04-05)


### Bug Fixes

* add \n to surrounding of listen message ([b4b1300](https://github.com/unjs/listhen/commit/b4b13005833232798d1d50b1b8208a560968834d))

### [0.2.2](https://github.com/unjs/listhen/compare/v0.2.1...v0.2.2) (2021-04-05)


### Bug Fixes

* add empty line to listening message ([8381c49](https://github.com/unjs/listhen/commit/8381c49a10f852418a007d1d242442efc0ca39fd))

### [0.2.1](https://github.com/unjs/listhen/compare/v0.2.0...v0.2.1) (2021-04-05)


### Features

* allow deferred open ([2b4a3f8](https://github.com/unjs/listhen/commit/2b4a3f8c3d77bbee2abf021854959a2475a46e05))

## [0.2.0](https://github.com/unjs/listhen/compare/v0.1.4...v0.2.0) (2021-04-05)


### ⚠ BREAKING CHANGES

* improve perf and dx

### Features

* improve perf and dx ([6834809](https://github.com/unjs/listhen/commit/6834809e77a804801a629165b711ffc5df8f2b1e))

### [0.1.4](https://github.com/unjs/listhen/compare/v0.1.3...v0.1.4) (2021-02-22)


### Features

* expose $fetch utility ([38e6b2c](https://github.com/unjs/listhen/commit/38e6b2c2e021adcdabc4a5e45a31b4c21fba618d))

### [0.1.3](https://github.com/unjs/listhen/compare/v0.1.2...v0.1.3) (2021-02-18)

### [0.1.2](https://github.com/unjs/listhen/compare/v0.1.1...v0.1.2) (2020-12-07)


### Bug Fixes

* graceful shutdown ([#6](https://github.com/unjs/listhen/issues/6)) ([3e1e001](https://github.com/unjs/listhen/commit/3e1e0019539f9e988ba9fd14fb366fcb79d18193))

### [0.1.1](https://github.com/unjs/listhen/compare/v0.1.0...v0.1.1) (2020-12-07)


### Features

* **types:** expose Listener type ([6ccb5e2](https://github.com/unjs/listhen/commit/6ccb5e2eca71c5370a3ed1f0911620a4b29761c7))

## [0.1.0](https://github.com/unjs/listhen/compare/v0.0.4...v0.1.0) (2020-12-05)


### ⚠ BREAKING CHANGES

* unsupport jest as is unstable

### Features

* unsupport jest as is unstable ([5ec0d07](https://github.com/unjs/listhen/commit/5ec0d078facad58bfbe0843d9c75d776160cce09))

### [0.0.4](https://github.com/unjs/listhen/compare/v0.0.3...v0.0.4) (2020-12-05)


### Features

* baseURL ([99d5471](https://github.com/unjs/listhen/commit/99d5471df4fa736a58e4f365999b07f0ff45f095))
* getURL utility ([1fa41a0](https://github.com/unjs/listhen/commit/1fa41a0719666ab70579dc9567502c498f031fdf))

### [0.0.3](https://github.com/unjs/listhen/compare/v0.0.2...v0.0.3) (2020-12-05)


### Features

* auto detect prod and test envs ([d43b130](https://github.com/unjs/listhen/commit/d43b130705c3473fadd7f22e7a9abffd767b13bf))
* clipboard and open ([b4ae5b6](https://github.com/unjs/listhen/commit/b4ae5b6dabdd293410ad9bafca6c01607fe526ca))
* guard against multiple close calls ([f9c0315](https://github.com/unjs/listhen/commit/f9c03155901b77218ec231d11e4630b5d69f1119))
* support custom certificate ([d462ba5](https://github.com/unjs/listhen/commit/d462ba59e71100951b267acd179bee76683b2f65))
* support graceful shutdown ([69d6d17](https://github.com/unjs/listhen/commit/69d6d1777c183a717fc5ecc374d523082a9ddcc6))


### Bug Fixes

* silently ignore clipboard and open errors ([b78a6c4](https://github.com/unjs/listhen/commit/b78a6c4cda700afbaeaa20266ebaac328549675a))

### 0.0.2 (2020-12-04)

### 0.0.1 (2020-12-04)
