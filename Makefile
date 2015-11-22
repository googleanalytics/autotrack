bin_path := ./node_modules/.bin

all: build

build:
	@ $(bin_path)/browserify index.js \
		-s ga.autotrack | $(bin_path)/uglifyjs \
		-o autotrack.js

.PHONY: all build
