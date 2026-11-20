# The API (backend/), built from the root of the repository: Render finds this file whatever its
# « Root Directory » (backend/Dockerfile is the same, for a service whose root is backend/).
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /api ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=build /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
