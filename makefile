.PHONY: all install build run lint clean preview image deploy expose

all: clean lint build run

VERSION := $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
CLUSTER_NAME := k8squest
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
	docker tag webfp-fe:$(VERSION) webfp-fe:local

deploy: image
	kind load docker-image webfp-fe:$(VERSION) webfp-fe:local --name $(CLUSTER_NAME)
	kubectl apply -f deploy/ns.yaml
	kubectl apply -f deploy/
	kubectl -n webfp set image statefulset/webfp-fe fe=webfp-fe:$(VERSION)
	kubectl -n webfp rollout status statefulset/webfp-fe --timeout=120s

expose:
	@echo "FE ready at http://localhost:$(LOCAL_PORT) (Ctrl+C to stop)"
	kubectl -n webfp port-forward svc/webfp-fe $(LOCAL_PORT):80
