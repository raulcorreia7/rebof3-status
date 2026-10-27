# Front door over the npm scripts. Same verbs as the monorepo and rebof3 Makefiles.

.DEFAULT_GOAL := help

# What `make clean` removes: the built site and the Vite cache. `distclean` adds node_modules.
BUILD_OUTPUT := site .vite

.PHONY: help build test format lint licenses check clean distclean

help:
	@echo "rebof3-status: the status page and picture renderer (npm scripts)"
	@echo ""
	@echo "Targets:"
	@echo "  help       List these targets (default)."
	@echo "  build      Build the page into site/ and render the picture (npm run build)."
	@echo "  test       Build, then check the model and the built site (npm test)."
	@echo "  format     No formatter is configured; nothing to do. CHECK=1 is accepted."
	@echo "  lint       Type check (npm run lint)."
	@echo "  licenses   Check dependency licences against the allow-list (npm run licenses)."
	@echo "  check      format CHECK=1, lint, licenses and test: the pre-commit gate."
	@echo "  clean      Remove build output: $(BUILD_OUTPUT)."
	@echo "  distclean  clean, then also node_modules; run npm ci after."

build:
	npm run build

test: build
	npm test

format:
	@echo "format: no formatter is configured for status"

lint:
	npm run lint

licenses:
	npm run licenses

check:
	$(MAKE) format CHECK=1
	$(MAKE) lint
	$(MAKE) licenses
	$(MAKE) test

clean:
	rm -rf $(BUILD_OUTPUT)

distclean: clean
	rm -rf node_modules
