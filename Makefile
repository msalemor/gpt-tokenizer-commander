default:
	@echo "Do something"

clean:
	rm -rf src/backend/wwwroot
	mkdir src/backend/wwwroot

build-ui: clean
	@echo "Build UI"
	cd src/frontend && npm run build
	cp -r src/frontend/dist/* src/backend/wwwroot

run: build-ui
	@echo "Run"
	cd src/backend && dotnet watch run

TAG=0.0.1
docker: build-ui
	@echo "Docker"
	cd src/backend && docker build . -t am8850/tokensplitter:$(TAG)

docker-run: docker
	@echo "Docker run"
	docker run --rm -p 8080:80 am8850/tokensplitter:$(TAG)

RG_NAME=rg-skragc-poc-eus
APP_NAME=tokenizer
IMAGE_NAME=am8850/tokensplitter:$(TAG)
docker-push: docker
	docker push am8850/tokensplitter:${TAG}
	sleep 5
	az webapp config container set --name $(APP_NAME) --resource-group ${RG_NAME} --docker-custom-image-name ${IMAGE_NAME}
	sleep 2
	az webapp stop --name $(APP_NAME) --resource-group ${RG_NAME}
	sleep 2
	az webapp start --name $(APP_NAME) --resource-group ${RG_NAME}
