# ---------------------------------------------------------------------------
# MULTI-STAGE BUILD
# Stage 1 has Maven + a full JDK to COMPILE the app (big image, ~500MB).
# Stage 2 copies ONLY the finished jar onto a small Java runtime (~200MB).
# WHY: the final image has no compiler or source code: smaller, faster to
# ship, less for an attacker to use.
# ---------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml FIRST and download dependencies. Docker caches each step
# ("layer"); as long as pom.xml doesn't change, this slow step is reused and
# only the fast compile below re-runs when you edit Java code.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- Stage 2: runtime ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Don't run as root inside the container (defence in depth).
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
# MaxRAMPercentage: size the Java heap from the CONTAINER's memory limit, not the host's.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
