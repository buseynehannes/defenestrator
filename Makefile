.PHONY: help install build test lint clean publish dev watch coverage docs

# Variables
NODE_MODULES := node_modules
DIST := dist
COVERAGE := coverage

# Default target
.DEFAULT_GOAL := help

## help: Show this help message
help:
	@echo "Defenestrator - Browser Tab Window Manager"
	@echo ""
	@echo "Available targets:"
	@grep -E '^## ' Makefile | sed 's/## //' | column -t -s ':'

## install: Install dependencies
install:
	npm install

## build: Build the TypeScript project
build: install
	npm run build

## test: Run tests
test:
	npm test -- --run

## test-watch: Run tests in watch mode
test-watch:
	npm test

## lint: Run TypeScript type checking
lint:
	npm run build

## coverage: Generate test coverage report
coverage:
	npm test -- --coverage

## clean: Clean build artifacts and node_modules
clean:
	rm -rf $(NODE_MODULES) $(DIST) $(COVERAGE)
	echo "Cleaned: $(NODE_MODULES), $(DIST), $(COVERAGE)"

## watch: Watch TypeScript files and rebuild
watch: install
	npx tsc --watch

## verify: Verify project integrity (build + test + coverage)
verify: clean install lint test coverage
	@echo "✓ Project verification complete"

## sign: Sign and publish the extension via web-ext (requires WEB_EXT_API_KEY and WEB_EXT_API_SECRET)
sign: build
	npx web-ext sign \
		--source-dir . \
		--api-key "$(WEB_EXT_API_KEY)" \
		--api-secret "$(WEB_EXT_API_SECRET)" \
		--channel "$${WEB_EXT_CHANNEL:-unlisted}"

