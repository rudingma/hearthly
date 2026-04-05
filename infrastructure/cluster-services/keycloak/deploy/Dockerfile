# Build stage — runs kc.sh build to pre-compile Quarkus augmentation
FROM quay.io/keycloak/keycloak:26.3.3 AS builder

WORKDIR /opt/keycloak

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_CACHE=local

RUN /opt/keycloak/bin/kc.sh build

# Production stage — contains pre-built optimized artifacts
FROM quay.io/keycloak/keycloak:26.3.3

LABEL org.opencontainers.image.source=https://github.com/rudingma/hearthly

WORKDIR /opt/keycloak

COPY --from=builder /opt/keycloak/ /opt/keycloak/

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
