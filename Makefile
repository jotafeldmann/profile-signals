# Profile Signals. Run `make` (or `make help`) to list everything.
#
# How this file documents itself:
#   ##@ Title          starts a group in the listing
#   target: ## summary the one-line description shown by `make help`
#   #> text            lines right above a target: details and examples, shown by
#                      `make help T=target` (one) or `make help-all` (all)
# Plain text, so it also works with grep:  grep -E '^[a-z-]+:.*##' Makefile

SHELL := bash
.DEFAULT_GOAL := help

# Node comes from .nvmrc (the single source of truth for the version). nvm is a shell function, so it is
# loaded in the same shell line as the command it prefixes: $(NODE) npm test
NVM_LOAD := . "$${NVM_DIR:-$$HOME/.nvm}/nvm.sh" >/dev/null
NODE     := $(NVM_LOAD) && nvm use --silent >/dev/null &&

# Visual baselines depend on fonts, so screenshots are taken in Playwright's own image, here and in CI
# (ADR-007). Tag and digest are bumped together with @playwright/test in package.json.
PW_IMAGE  := mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579
PW_DOCKER := docker run --rm --ipc=host --user "$$(id -u):$$(id -g)" -e HOME=/tmp -e CI -v "$$PWD":/work -w /work $(PW_IMAGE)

# Colours only on a terminal, so `make help | grep x` stays clean text.
HELP_COLOR := $(shell [ -t 1 ] && echo 1 || echo 0)
define HELP_AWK
function flush() { n = 0 }
/^##@/ { if (mode != "one") printf "\n%s%s%s\n", B, substr($$0, 5), R; next }
/^#>/ { doc[++n] = substr($$0, 4); next }
/^[a-zA-Z0-9_-]+:.*## / {
  split($$0, parts, ":.*## "); name = parts[1]; desc = parts[2]
  if (mode == "one" && name != target) { flush(); next }
  printf "  %smake %-20s%s %s\n", C, name, R, desc
  if (mode != "list") for (i = 1; i <= n; i++) printf "      %s\n", doc[i]
  if (mode != "list" && n > 0) printf "\n"
  found = 1; flush(); next
}
{ flush() }
END { if (mode == "one" && !found) { print "unknown target: " target " (see `make help`)" } }
endef
export HELP_AWK
HELP_ARGS = -v mode=$(1) -v target="$(T)" $(if $(filter 1,$(HELP_COLOR)),-v C='\033[36m' -v B='\033[1m' -v R='\033[0m',-v C= -v B= -v R=)

##@ Getting started
.PHONY: doctor node install init start
#> Compares the Node in use with .nvmrc, and checks for docker (visual tests only) and zip (make package).
doctor: ## Check tool versions
	@$(NVM_LOAD); want="$$(cat .nvmrc)"; have="$$(nvm use --silent >/dev/null 2>&1; node --version | sed 's/^v//')"; \
	  if [ "$$want" = "$$have" ]; then echo "node $$have (matches .nvmrc)"; else echo "node $$have but .nvmrc wants $$want: run make node"; fi
	@command -v docker >/dev/null && echo "docker: $$(docker --version)" || echo "docker: missing (needed only by make test-visual)"
	@command -v zip >/dev/null && echo "zip: ok" || echo "zip: missing (needed by make package)"

#> Installs (if missing) and selects the version in .nvmrc. Needs nvm: https://github.com/nvm-sh/nvm
node: ## Install and select the Node version pinned in .nvmrc
	@$(NVM_LOAD) && nvm install && nvm use

#> npm packages, plus the Chromium build Playwright drives (in ~/.cache/ms-playwright).
install: ## Install or update dependencies and the test browser
	$(NODE) npm install && npx playwright install chromium

init: ## Create what must exist once (nothing yet)
	@echo "nothing to initialise: the extension has no local files or secrets"

#> Opens Chromium with the extension loaded on synthetic profile pages (no request reaches LinkedIn),
#> to try a change by hand. To use it on the real LinkedIn, load extension/ in Chrome: docs/getting-started.md
#> Example:   make start PROFILE=new-account
start: ## Try the extension in a browser on synthetic profiles
	$(NODE) PROFILE="$(PROFILE)" npm start

##@ Tests and quality
.PHONY: test test-e2e test-visual test-visual-update lint typecheck ci
#> Scoring rules and release consistency, with node --test. No browser.
test: ## Fast test suite (rules, versions, package contents)
	$(NODE) npm test

#> The extension loaded in Playwright's Chromium, headless, on synthetic pages routed in place of
#> linkedin.com: collection, cache, panel, settings tab. HEADED=1 shows the browser.
#> Example:   HEADED=1 make test-e2e
test-e2e: ## Browser tests of the installed extension
	$(NODE) npm run test:e2e

#> Screenshots of the panel, the dot and the settings tab against e2e/visual.spec.ts-snapshots/,
#> inside Playwright's Docker image so fonts match CI.
test-visual: ## Visual tests, in Playwright's Docker image
	$(PW_DOCKER) npm run test:visual

#> CAUTION: overwrites the stored screenshots. Look at the new ones before committing them.
test-visual-update: ## Regenerate the visual baselines, in Playwright's Docker image
	$(PW_DOCKER) npm run test:visual:update

lint: ## Syntax check of the extension scripts and JSON
	$(NODE) npm run lint

typecheck: ## Type check the tests and scripts
	$(NODE) npm run typecheck

ci: lint typecheck test test-e2e test-visual ## Everything that must be green before committing

##@ Release
.PHONY: package
#> Builds dist/profile-signals-<version>.zip with only the files Chrome loads. CI attaches it to the
#> GitHub release of each v* tag; the version comes from extension/manifest.json.
package: ## Build the zip people install from
	$(NODE) npm run package

##@ Help
.PHONY: help help-all
help: ## List the commands. Details of one: make help T=test-e2e
	@$(if $(T),,echo)
	@awk $(call HELP_ARGS,$(if $(T),one,list)) "$$HELP_AWK" $(MAKEFILE_LIST)
	@$(if $(T),,echo "  Details and examples: make help T=<target>   |   everything: make help-all")

help-all: ## List the commands with details and examples
	@awk $(call HELP_ARGS,all) "$$HELP_AWK" $(MAKEFILE_LIST)

# Shared targets from the ai repository: usage, decisions, ai-audit.
# The leading `-` keeps this project working on a machine without ai.
-include $(HOME)/workspace/ai/make/ai.mk
