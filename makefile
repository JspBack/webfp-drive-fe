.PHONY: all install build run lint clean preview

all: clean lint build run

install:
	pnpm install --frozen-lockfile

build:
	pnpm build

run:
	pnpm dev

preview:
	pnpm preview

lint:
	pnpm lint

clean:
	rm -rf dist/
