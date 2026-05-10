.PHONY: test test-chromium test-firefox test-webkit test-headed test-headless \
        test-login test-ci test-debug test-ui test-no-retry \
        report trace clean install help

# ── Default ────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Playwright Test Runner"
	@echo "  ─────────────────────────────────────────────────────────"
	@echo "  make test              Run all tests (all projects)"
	@echo "  make test-chromium     Run tests on Chromium only"
	@echo "  make test-firefox      Run tests on Firefox only"
	@echo "  make test-webkit       Run tests on WebKit only"
	@echo ""
	@echo "  make test-headed       Force headed mode (browser visible)"
	@echo "  make test-headless     Force headless mode"
	@echo "  make test-ci           CI mode: headless, 1 worker, no report auto-open"
	@echo ""
	@echo "  make test-login        Run login suite only (chromium)"
	@echo "  make test-debug        Open Playwright Inspector for step-through"
	@echo "  make test-ui           Open Playwright UI mode"
	@echo "  make test-no-retry     Run once, no retries (fast failure feedback)"
	@echo ""
	@echo "  make report            Reopen last HTML report"
	@echo "  make trace FILE=...    Open a specific trace.zip"
	@echo "  make clean             Delete test-results/ and playwright-report/"
	@echo "  make install           Install dependencies"
	@echo "  ─────────────────────────────────────────────────────────"
	@echo ""

# ── Installation ───────────────────────────────────────────────────────────────
install:
	npm install
	npx playwright install --with-deps

# ── Full suite ─────────────────────────────────────────────────────────────────
test:
	npx playwright test

# ── Per browser ────────────────────────────────────────────────────────────────
test-chromium:
	npx playwright test --project=chromium

test-firefox:
	npx playwright test --project=firefox

test-webkit:
	npx playwright test --project=webkit

# ── Head / headless overrides ──────────────────────────────────────────────────
test-headed:
	npx playwright test --headed

test-headless:
	npx playwright test --headless

# ── CI mode ────────────────────────────────────────────────────────────────────
# Sets CI=true so playwright.config.ts applies CI-specific settings
# (headless:true, workers:1, html report never auto-opens)
test-ci:
	CI=true npx playwright test

# ── Specific suites ────────────────────────────────────────────────────────────
test-login:
	npx playwright test tests/saucedemo/login.spec.ts --project=chromium

# ── Debugging ──────────────────────────────────────────────────────────────────
# Opens Playwright Inspector: step through actions, inspect locators live
test-debug:
	PWDEBUG=1 npx playwright test

# Opens the Playwright UI mode: run/filter/watch tests interactively
test-ui:
	npx playwright test --ui

# Skips retries so failures surface on the first attempt — useful when iterating
test-no-retry:
	npx playwright test --retries=0

# ── Artifacts ──────────────────────────────────────────────────────────────────
report:
	npx playwright show-report

# Usage: make trace FILE=test-results/my-test/trace.zip
trace:
	npx playwright show-trace $(FILE)

# ── Cleanup ────────────────────────────────────────────────────────────────────
clean:
	rm -rf test-results playwright-report
	@echo "Cleaned test-results/ and playwright-report/"
