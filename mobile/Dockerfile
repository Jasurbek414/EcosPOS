FROM savdo-mobile-build:latest AS build
WORKDIR /app

COPY lib/ ./lib/
COPY assets/ ./assets/
COPY pubspec.yaml ./

# Ilova nomini EcosPOS ga o'zgartirish va round icon sozlash
RUN sed -i 's/android:label="[^"]*"/android:label="EcosPOS"/g' android/app/src/main/AndroidManifest.xml && \
    sed -i 's/android:icon="@mipmap\/ic_launcher"/android:icon="@mipmap\/ic_launcher" android:roundIcon="@mipmap\/ic_launcher_round"/g' android/app/src/main/AndroidManifest.xml

# EcosPOS logotipini ilova ikonkasi sifatida o'rnatish
RUN cp assets/res/mipmap-mdpi/ic_launcher.png android/app/src/main/res/mipmap-mdpi/ic_launcher.png && \
    cp assets/res/mipmap-hdpi/ic_launcher.png android/app/src/main/res/mipmap-hdpi/ic_launcher.png && \
    cp assets/res/mipmap-xhdpi/ic_launcher.png android/app/src/main/res/mipmap-xhdpi/ic_launcher.png && \
    cp assets/res/mipmap-xxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png && \
    cp assets/res/mipmap-xxxhdpi/ic_launcher.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png && \
    cp assets/res/mipmap-mdpi/ic_launcher_round.png android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png && \
    cp assets/res/mipmap-hdpi/ic_launcher_round.png android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png && \
    cp assets/res/mipmap-xhdpi/ic_launcher_round.png android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png && \
    cp assets/res/mipmap-xxhdpi/ic_launcher_round.png android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png && \
    cp assets/res/mipmap-xxxhdpi/ic_launcher_round.png android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png

RUN flutter pub get
RUN flutter build apk --release --dart-define=API_BASE_URL=https://savdo-api.ecos.uz
