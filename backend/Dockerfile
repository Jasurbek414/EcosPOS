# ============= BACKEND BUILD =============
FROM maven:3.9.6-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app
COPY pom.xml pom.xml
COPY src src
# Testlar ATAYLAB o'tkazib yuborilmaydi: bu mashinada deploy qo'lda qilinadi va
# CI har doim ham ishlamasligi mumkin, shuning uchun pul yo'llari testlari
# aynan deploy paytida ishlashi kerak. Test yiqilsa image ham qurilmaydi.
RUN mvn clean package

# ============= BACKEND RUNTIME =============
FROM eclipse-temurin:21-jre-alpine AS backend
# Alpine'da zona ma'lumotlari yo'q — tzdata'siz Asia/Tashkent topilmay JVM UTC'da
# qoladi va yarim tundan keyingi savdolar oldingi kunga yozilaveradi.
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tashkent
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Duser.timezone=Asia/Tashkent", "-jar", "app.jar"]
