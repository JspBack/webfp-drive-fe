.PHONY: all install build run lint clean preview image deploy-gke

all: clean lint build run

VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LOCAL_PORT := 8080

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
image:
	docker build -t webfp-fe:$(VERSION) .
deploy-gke:
	kubectl apply -f deploy/ns.yaml
	kubectl apply -f deploy/ -f deploy/gke/
	kubectl -n webfp rollout restart statefulset/webfp-fe
	kubectl -n webfp rollout status statefulset/webfp-fe --timeout=300s
