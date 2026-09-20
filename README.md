# Zyndex

Zyndex is a cloud-native ScholarSphere Digital solution consisting of a React + Vite frontend and a Spring Cloud microservices suite.

## Microservices Architecture & Port Mapping
* **Eureka Discovery Server** (`eureka-server` - Port `8761`): Service registry.
* **API Gateway** (`api-gateway` - Port `8080`): Centrally handles CORS, decodes JWT token signatures, and forwards user claims in HTTP headers (`X-User-Id`, `X-User-Role`, `X-User-Email`, `X-User-Name`).
* **Auth Service** (`auth-service` - Port `8081`): Manages authentication, user profiles, and OTP generation. Uses `zyndex_auth` database.
* **Content Service** (`content-service` - Port `8082`): Manages the textbook/resource catalog, ratings, contact forms, and secure file streaming with short-lived UUID preview tokens. Uses `zyndex_content` database.
* **Access Service** (`access-service` - Port `8083`): Enforces entitlement checking and digital rights permissions. Uses `zyndex_access` database.
* **Usage Service** (`usage-service` - Port `8084`): Logs views, downloads, reading events, and aggregates metrics. Uses `zyndex_usage` database.

## Running Locally

### 1. Database Setup
Ensure MySQL is running. Create four isolated databases:
```sql
CREATE DATABASE IF NOT EXISTS zyndex_auth;
CREATE DATABASE IF NOT EXISTS zyndex_content;
CREATE DATABASE IF NOT EXISTS zyndex_access;
CREATE DATABASE IF NOT EXISTS zyndex_usage;
```
Configure database credentials via environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.

### 2. Launch Services
Compile and package the parent POM from the root folder:
```powershell
.\mvnw.cmd clean package -DskipTests
```
Launch the microservice modules in order:
1. `java -jar eureka-server/target/eureka-server-1.0.0.jar`
2. `java -jar api-gateway/target/api-gateway-1.0.0.jar`
3. `java -jar auth-service/target/auth-service-1.0.0.jar`
4. `java -jar content-service/target/content-service-1.0.0.jar`
5. `java -jar access-service/target/access-service-1.0.0.jar`
6. `java -jar usage-service/target/usage-service-1.0.0.jar`

### 3. Launch Frontend
From the root folder:
```powershell
npm install
npm run dev
```

## Deployment
* **Frontend Build Command**: `npm run build`
* **Frontend Publish Directory**: `dist`
* **Backend Build Command**: `.\mvnw.cmd clean package -DskipTests`
* **Backend Deployment**: Set target environment variables on your cloud provider (e.g. AWS ECS, GCP Cloud Run, or Kubernetes). Run each microservice jar file.
