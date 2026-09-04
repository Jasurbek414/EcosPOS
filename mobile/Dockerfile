# Flutter SDK/Android SDK bu noutbukda o'rnatilmagan — shuning uchun APK shu Docker
# image ichida quriladi (maktab_davomad va inventarizatsiya loyihalaridagi bir xil usul).
#
# Ishlatish:
#   docker build -t savdo-mobile-build .
#   docker create --name savdo-mobile-extract savdo-mobile-build
#   docker cp savdo-mobile-extract:/app/build/app/outputs/flutter-apk/app-release.apk ./app-release.apk
#   docker rm savdo-mobile-extract
#
# Backend manzilini o'zgartirish uchun (standart: https://savdo-api.ecos.uz):
#   docker build --build-arg API_BASE_URL=https://sizning-domeningiz.uz -t savdo-mobile-build .

FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

ARG API_BASE_URL=https://savdo-api.ecos.uz

# Repo'da faqat lib/ va pubspec.yaml bor — android/ papkasi (native Gradle loyihasi)
# hali generatsiya qilinmagan, chunki buni faqat Flutter SDK o'zi qila oladi.
COPY . .
RUN flutter create --platforms=android --org uz.ecos.savdo .

# mobile_scanner (shtrix-kod skaneri) uchun kamera ruxsati kerak — android/ har build'da
# qaytadan generatsiya qilingani uchun bu qatorni generatsiyadan KEYIN qo'shamiz.
RUN sed -i '/<manifest /a\    <uses-permission android:name="android.permission.CAMERA"/>' android/app/src/main/AndroidManifest.xml

RUN flutter pub get
RUN flutter build apk --release --dart-define=API_BASE_URL=${API_BASE_URL}
