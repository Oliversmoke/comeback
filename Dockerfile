FROM gradle:8.12-jdk21 AS builder
WORKDIR /app
COPY --chown=gradle:gradle . .
RUN rm -rf .gradle && gradle :api-gateway:shadowJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl tzdata
COPY --from=builder /app/api-gateway/build/libs/api-gateway-*.jar /app/api-gateway.jar
RUN addgroup -S rickchat && adduser -S rickchat -G rickchat \
  && mkdir -p /app/logs && chown -R rickchat:rickchat /app
USER rickchat
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f "http://localhost:${PORT:-8080}/health" || exit 1
ENV JAVA_OPTS="-XX:+UseZGC -XX:MaxRAMPercentage=75.0 -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/api-gateway.jar"]
