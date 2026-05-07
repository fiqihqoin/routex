FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN go mod tidy
RUN go build -o main cmd/api/main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates curl
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
