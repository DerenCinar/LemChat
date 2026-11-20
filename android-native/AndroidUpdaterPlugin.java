package com.skellytalk.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "AndroidUpdater")
public class AndroidUpdaterPlugin extends Plugin {
  private static final String UPDATE_APK_FILENAME = "skellytalk-update.apk";
  private static final String TEMP_APK_FILENAME = "skellytalk-update.apk.part";
  private static final int MAX_REDIRECTS = 8;

  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private final AtomicBoolean downloading = new AtomicBoolean(false);

  @PluginMethod
  public void downloadAndInstall(PluginCall call) {
    String urlString = call.getString("url");
    if (urlString == null || urlString.trim().isEmpty()) {
      call.reject("Missing update APK URL.");
      return;
    }

    String cleanUrl = urlString.trim();
    if (!isAllowedGithubUrl(cleanUrl)) {
      call.reject("Untrusted update download URL.");
      return;
    }

    if (!downloading.compareAndSet(false, true)) {
      call.reject("An update download is already in progress.");
      return;
    }

    Context ctx = getContext();
    if (ctx == null) {
      downloading.set(false);
      call.reject("Android application context is unavailable.");
      return;
    }

    executor.execute(() -> {
      HttpURLConnection conn = null;
      File partFile = new File(ctx.getCacheDir(), TEMP_APK_FILENAME);
      File targetFile = new File(ctx.getCacheDir(), UPDATE_APK_FILENAME);

      try {
        if (partFile.exists() && !partFile.delete()) {
          throw new IllegalStateException("Could not clear previous temporary APK file.");
        }

        conn = openConnectionWithRedirects(cleanUrl);
        long totalBytes = -1L;
        String lengthHeader = conn.getHeaderField("Content-Length");
        if (lengthHeader != null) {
          try {
            totalBytes = Long.parseLong(lengthHeader.trim());
          } catch (NumberFormatException ignored) {
            totalBytes = -1L;
          }
        }

        long bytesDownloaded = 0L;
        int lastReportedProgress = -1;
        byte[] buffer = new byte[16384];

        try (
          InputStream in = new BufferedInputStream(conn.getInputStream());
          FileOutputStream out = new FileOutputStream(partFile)
        ) {
          int read;
          while ((read = in.read(buffer)) != -1) {
            out.write(buffer, 0, read);
            bytesDownloaded += read;

            if (totalBytes > 0) {
              int progress = (int) Math.min(100L, (bytesDownloaded * 100L) / totalBytes);
              if (lastReportedProgress < 0 || progress == 100 || progress - lastReportedProgress >= 2) {
                lastReportedProgress = progress;
                emitProgress(progress, bytesDownloaded, totalBytes);
              }
            } else if (lastReportedProgress < 0) {
              lastReportedProgress = 0;
              emitProgress(0, bytesDownloaded, -1L);
            }
          }
          out.flush();
        }

        if (partFile.length() <= 0L) {
          throw new IllegalStateException("Downloaded APK file is empty.");
        }

        if (targetFile.exists() && !targetFile.delete()) {
          throw new IllegalStateException("Could not replace existing cached APK.");
        }
        if (!partFile.renameTo(targetFile)) {
          throw new IllegalStateException("Could not finalize downloaded APK file.");
        }

        emitProgress(100, bytesDownloaded, totalBytes > 0 ? totalBytes : bytesDownloaded);

        InstallLaunchOutcome outcome = launchApkInstaller(targetFile);
        JSObject result = new JSObject();
        result.put("downloaded", true);
        result.put("installLaunched", outcome.installLaunched);
        result.put("needsPermission", outcome.needsPermission);
        call.resolve(result);
      } catch (Exception err) {
        if (partFile.exists()) {
          // Best-effort cleanup of incomplete download
          //noinspection ResultOfMethodCallIgnored
          partFile.delete();
        }
        String msg = err.getMessage() != null ? err.getMessage() : "Failed to download APK.";
        call.reject(msg, err);
      } finally {
        if (conn != null) {
          conn.disconnect();
        }
        downloading.set(false);
      }
    });
  }

  @PluginMethod
  public void installDownloadedApk(PluginCall call) {
    Context ctx = getContext();
    if (ctx == null) {
      call.reject("Android application context is unavailable.");
      return;
    }

    File targetFile = new File(ctx.getCacheDir(), UPDATE_APK_FILENAME);
    if (!targetFile.exists() || targetFile.length() <= 0L) {
      call.reject("No downloaded update APK found. Please download the update again.");
      return;
    }

    try {
      InstallLaunchOutcome outcome = launchApkInstaller(targetFile);
      JSObject result = new JSObject();
      result.put("installLaunched", outcome.installLaunched);
      result.put("needsPermission", outcome.needsPermission);
      call.resolve(result);
    } catch (Exception err) {
      String msg = err.getMessage() != null ? err.getMessage() : "Unable to start APK installer.";
      call.reject(msg, err);
    }
  }

  private void emitProgress(int progress, long bytesDownloaded, long totalBytes) {
    JSObject data = new JSObject();
    data.put("progress", progress);
    data.put("bytesDownloaded", bytesDownloaded);
    data.put("totalBytes", totalBytes);
    notifyListeners("downloadProgress", data);
  }

  private InstallLaunchOutcome launchApkInstaller(File apkFile) {
    Context ctx = getContext();
    if (ctx == null) {
      throw new IllegalStateException("Android application context is unavailable.");
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
      Intent permissionIntent = new Intent(
        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
        Uri.parse("package:" + ctx.getPackageName())
      );
      permissionIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startIntentSafely(ctx, permissionIntent);
      return new InstallLaunchOutcome(false, true);
    }

    Uri apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apkFile);
    Intent installIntent = new Intent(Intent.ACTION_VIEW);
    installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
    installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
    startIntentSafely(ctx, installIntent);
    return new InstallLaunchOutcome(true, false);
  }

  private void startIntentSafely(Context ctx, Intent intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    ctx.startActivity(intent);
  }

  private HttpURLConnection openConnectionWithRedirects(String initialUrl) throws Exception {
    String currentUrl = initialUrl;
    for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isAllowedGithubUrl(currentUrl)) {
        throw new SecurityException("Blocked redirect to untrusted host.");
      }

      URL url = new URL(currentUrl);
      HttpURLConnection conn = (HttpURLConnection) url.openConnection();
      conn.setInstanceFollowRedirects(false);
      conn.setConnectTimeout(15000);
      conn.setReadTimeout(30000);
      conn.setRequestMethod("GET");
      conn.setRequestProperty("User-Agent", "SkellyTalk-Android-Updater");
      conn.setRequestProperty("Accept", "application/octet-stream, */*");

      int code = conn.getResponseCode();
      if (
        code == HttpURLConnection.HTTP_MOVED_PERM ||
        code == HttpURLConnection.HTTP_MOVED_TEMP ||
        code == HttpURLConnection.HTTP_SEE_OTHER ||
        code == 307 ||
        code == 308
      ) {
        String location = conn.getHeaderField("Location");
        conn.disconnect();
        if (location == null || location.trim().isEmpty()) {
          throw new IllegalStateException("Redirect missing Location header (HTTP " + code + ").");
        }
        currentUrl = new URI(currentUrl).resolve(location.trim()).toString();
        continue;
      }

      if (code < 200 || code >= 300) {
        conn.disconnect();
        throw new IllegalStateException("Download failed with HTTP " + code + ".");
      }

      return conn;
    }

    throw new IllegalStateException("Too many redirects while downloading APK.");
  }

  private static boolean isAllowedGithubUrl(String rawUrl) {
    try {
      URI uri = new URI(rawUrl);
      String scheme = uri.getScheme();
      String host = uri.getHost();
      if (scheme == null || host == null) {
        return false;
      }
      if (!"https".equalsIgnoreCase(scheme)) {
        return false;
      }
      String normalizedHost = host.toLowerCase(Locale.US);
      return (
        normalizedHost.equals("github.com") ||
        normalizedHost.endsWith(".github.com") ||
        normalizedHost.equals("githubusercontent.com") ||
        normalizedHost.endsWith(".githubusercontent.com")
      );
    } catch (Exception ignored) {
      return false;
    }
  }

  @Override
  protected void handleOnDestroy() {
    executor.shutdownNow();
    super.handleOnDestroy();
  }

  private static final class InstallLaunchOutcome {
    final boolean installLaunched;
    final boolean needsPermission;

    InstallLaunchOutcome(boolean installLaunched, boolean needsPermission) {
      this.installLaunched = installLaunched;
      this.needsPermission = needsPermission;
    }
  }
}
