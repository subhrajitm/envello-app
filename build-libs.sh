#!/bin/bash

# Build script for shared libraries
# Builds in dependency order to ensure cross-library references work

echo "Building shared libraries in dependency order..."

echo "1/4 Building shared-core (no dependencies)..."
npx ng build shared-core || exit 1

echo "2/4 Building shared-domain (depends on core)..."
npx ng build shared-domain || exit 1

echo "3/4 Building shared-state (depends on core, domain)..."
npx ng build shared-state || exit 1

echo "4/4 Building shared-data (depends on core, domain, state)..."
npx ng build shared-data || exit 1

echo "✅ All shared libraries built successfully!"
