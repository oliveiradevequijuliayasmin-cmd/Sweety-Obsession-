# Sweety Obsession

Jogo web empacotado para Android com Capacitor.

## Gerar o APK pelo GitHub

1. Abra a aba **Actions** do repositório.
2. Selecione **Gerar APK Android** e clique em **Run workflow**.
3. Quando o workflow terminar, baixe o artefato **Sweet-Poison-APK**.
4. No Android, abra o arquivo `app-debug.apk` para instalar. Se solicitado, permita a instalação de apps dessa origem.

O workflow gera um APK de depuração instalável. Para publicar na Play Store, será necessário gerar e assinar uma versão de lançamento.

## Gerar localmente

Requer Node.js 22, Java 21 e Android SDK configurado.

```sh
cd app
npm ci
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

O APK será criado em `app/android/app/build/outputs/apk/debug/app-debug.apk`.
