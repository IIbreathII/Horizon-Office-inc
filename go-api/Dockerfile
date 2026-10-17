FROM golang:latest AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN apt-get update && apt-get install -y curl && \
    curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

RUN CGO_ENABLED=0 GOOS=linux go build -o api_server ./cmd/api/main.go

FROM alpine:latest

WORKDIR /root/

RUN apk --no-cache add ca-certificates

COPY --from=builder /app/api_server .
COPY --from=builder /app/global-bundle.pem .

EXPOSE 8080

CMD ["./api_server"]