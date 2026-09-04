# Savdo — mobil hamroh ilova (Flutter)

Do'kon **egasi/menejeri** uchun hamroh ilova: tezkor bosh sahifa, kam qolgan mahsulotlar
ro'yxati, shtrix-kod bilan mahsulotni tekshirish va qoldiqni tuzatish, so'nggi savdolar
ro'yxati. Bu ilova **to'liq kassa (POS) emas** — savdo (checkout) yaratish faqat veb-ilovada
(`https://savdo.ecos.uz`) qiladi; mobil ilova do'kon bo'ylab yurib inventarizatsiya/tekshiruv
qilish uchun mo'ljallangan.

## Rollarga qarab funksiyalar

| Funksiya | OWNER | MANAGER | CASHIER |
|---|---|---|---|
| Bosh sahifa statistikasi (`/reports/dashboard`) | ✅ (filial tanlab) | ✅ | ❌ (oddiy xush kelibsiz ekrani) |
| Kam qolganlar ro'yxati | ✅ (filial tanlab) | ✅ | ✅ |
| Qoldiqni tuzatish | ✅ | ✅ | ❌ (tugma ko'rinmaydi) |
| Shtrix-kod skaneri | ✅ | ✅ | ✅ (faqat ko'rish, tuzatish yo'q) |
| So'nggi savdolar | ✅ (filial tanlab) | ✅ | ✅ |

OWNER bir nechta filialga ega bo'lishi mumkin, shuning uchun Qoldiqlar/Skanerlash/Savdolar
ekranlarida avval filial tanlanadi (tanlov ekranlar orasida saqlanadi). MANAGER/CASHIER
uchun filial backendda avtomatik aniqlanadi — tanlov ko'rsatilmaydi.

## Qurish (build)

Bu noutbukda Flutter SDK o'rnatilmagan — Docker orqali quriladi:

```bash
cd mobile
docker build -t savdo-mobile-build .
docker create --name savdo-mobile-extract savdo-mobile-build
docker cp savdo-mobile-extract:/app/build/app/outputs/flutter-apk/app-release.apk ./app-release.apk
docker rm savdo-mobile-extract
```

Backend manzilini o'zgartirish uchun (standart: `https://savdo-api.ecos.uz`):

```bash
docker build --build-arg API_BASE_URL=https://sizning-domeningiz.uz -t savdo-mobile-build .
```

`android/` papkasi repo'da **saqlanmaydi** — `flutter create` bilan har build'da Docker
ichida qaytadan generatsiya qilinadi (`.gitignore`ga qarang). Shu sabab bu loyihada
`:stable` Docker image tegi ataylab ishlatiladi (mavjud `pubspec.lock` yo'q, ziddiyat xavfi yo'q).

`mobile_scanner` uchun kerakli `CAMERA` ruxsati `AndroidManifest.xml`ga Dockerfile
ichida `flutter create`dan KEYIN `sed` bilan qo'shiladi (fayl har build'da qaytadan
generatsiya qilingani uchun qo'lda tahrirlab bo'lmaydi).

## API kontrakti

Backend: `https://savdo-api.ecos.uz/api/v1` (build vaqtida `API_BASE_URL` orqali almashtiriladi).

- `POST /auth/login` — `{companyCode, username, password}` → `{accessToken, refreshToken, username, fullName, role, companyId, branchId}`
- `POST /auth/refresh` — `{refreshToken}` → xuddi shu shakl (401 kelganda avtomatik bir marta chaqiriladi, `lib/core/api_client.dart`)
- `GET /reports/dashboard?branchId=` — OWNER/MANAGER
- `GET /stock/low?branchId=` — barcha rollar
- `POST /stock/adjustments` — OWNER/MANAGER
- `GET /products/barcode/{code}` — barcha rollar
- `GET /sales?branchId=&from=&to=` — barcha rollar
- `GET /branches` — barcha rollar (filial tanlagich uchun)

## Loyiha tuzilishi

```
lib/
  core/          — api_client (Dio + 401 refresh), token_storage (flutter_secure_storage),
                   providers, branch_provider (OWNER filial tanlovi), router (go_router), formatters
  models/        — JSON <-> Dart model klasslari
  theme/         — AppTheme (ko'k rang, Material 3)
  widgets/       — BranchPicker (OWNER uchun filial tanlagich)
  features/
    auth/        — login ekrani + AuthController (Riverpod StateNotifier)
    dashboard/   — statistika kartalari (manager) / xush kelibsiz ekrani (kassir)
    stock/       — kam qolganlar ro'yxati + tezkor tuzatish bottom sheet
    scanner/     — mobile_scanner asosidagi shtrix-kod ekrani
    sales/       — so'nggi savdolar ro'yxati
    profile/     — profil + chiqish
    shell/       — pastki navigatsiya (HomeShell)
```

## Hozircha qurilmagan / keyingi bosqich

- **iOS** — Docker build faqat Android (APK) uchun sozlangan. iOS uchun Mac va Apple
  Developer hisobi kerak.
- **Push-bildirishnomalar** — talab qilinmagan (spetsifikatsiyada yo'q).
- **Til tanlash** — hozircha faqat o'zbek tilida.
