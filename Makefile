IMAGE = node:lts
RUN   = docker run --rm -v .:/app -w /app $(IMAGE)

.PHONY: init start stop build test

init:
	$(RUN) npm install

start:
	docker compose up -d

stop:
	docker compose down

build:
	$(RUN) npm run build

test:
	$(RUN) npm test
