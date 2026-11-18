package com.sscboard.learning

import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.io.RandomAccessFile
import java.net.URLEncoder
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

class SecureContentModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SecureContentModule"
        private const val TAG = "SecureContentModule"
    }

    private val context: Context = reactContext
    private var streamServer: DecryptionStreamServer? = null
    private var candidateDirectories: MutableList<File> = ArrayList()

    override fun getName(): String = NAME

    private fun getCandidateDirectories(): List<File> {
        val list = ArrayList<File>()
        
        // 1. App-private external storage
        val extFiles = context.getExternalFilesDir(null)
        if (extFiles != null) {
            val appDir = File(extFiles, "offline_content")
            if (!appDir.exists()) appDir.mkdirs()
            list.add(appDir)
        }

        // 2. Public Downloads folder
        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            if (downloadsDir != null) {
                list.add(File(downloadsDir, "SSCBoard/offline_content"))
                list.add(File(downloadsDir, "offline_content"))
            }
        } catch (_: Exception) {}

        // 3. Fallback standard SD card locations
        list.add(File("/sdcard/Download/SSCBoard/offline_content"))
        list.add(File("/sdcard/Download/offline_content"))
        list.add(File("/sdcard/SSCBoard/offline_content"))

        // 4. Public Documents folder
        try {
            val docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            if (docsDir != null) {
                list.add(File(docsDir, "SSCBoard/offline_content"))
            }
        } catch (_: Exception) {}

        return list
    }

    /**
     * Start the embedded DecryptionStreamServer with derived AES-256 key.
     */
    @ReactMethod
    fun startDecryptionServer(
        masterSecret: String,
        clientId: String,
        clientSecret: String,
        promise: Promise
    ) {
        try {
            candidateDirectories.clear()
            candidateDirectories.addAll(getCandidateDirectories())

            // Create subdirectories in the primary app directory
            if (candidateDirectories.isNotEmpty()) {
                val primary = candidateDirectories[0]
                File(primary, "videos").mkdirs()
                File(primary, "pdfs").mkdirs()
            }

            // Derive 32-byte AES key
            val key = DecryptionStreamServer.deriveKey(masterSecret, clientId, clientSecret)

            // Stop existing server if running
            streamServer?.stop()

            // Create and start new server with all candidate search directories
            val server = DecryptionStreamServer(candidateDirectories, key)
            val port = server.start()
            streamServer = server

            val result = Arguments.createMap()
            result.putInt("port", port)
            result.putString("sessionToken", server.sessionToken)
            result.putString("contentDir", if (candidateDirectories.isNotEmpty()) candidateDirectories[0].absolutePath else "/sdcard/offline_content")
            result.putString("host", "127.0.0.1")

            Log.i(TAG, "SecureContentModule initialized on port $port across ${candidateDirectories.size} search directories")
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting DecryptionStreamServer", e)
            promise.reject("SERVER_START_ERROR", e.message, e)
        }
    }

    /**
     * Stop the local stream server.
     */
    @ReactMethod
    fun stopDecryptionServer(promise: Promise) {
        try {
            streamServer?.stop()
            streamServer = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVER_STOP_ERROR", e.message, e)
        }
    }

    /**
     * Get streamable HTTP URL for an encrypted file.
     * e.g. "http://127.0.0.1:8899/stream?file=videos%2Fch1.mp4.enc&token=..."
     */
    @ReactMethod
    fun getStreamUrl(relativePath: String, promise: Promise) {
        val server = streamServer
        if (server == null || server.port == 0) {
            promise.reject("SERVER_NOT_RUNNING", "Decryption stream server is not running.")
            return
        }

        try {
            val encodedFile = URLEncoder.encode(relativePath, "UTF-8")
            val token = server.sessionToken
            val url = "http://127.0.0.1:${server.port}/stream?file=$encodedFile&token=$token"
            promise.resolve(url)
        } catch (e: Exception) {
            promise.reject("STREAM_URL_ERROR", e.message, e)
        }
    }

    /**
     * Check if an encrypted content file exists in any of the offline storage directories.
     */
    @ReactMethod
    fun checkFileExists(relativePath: String, promise: Promise) {
        try {
            val server = streamServer
            if (server != null) {
                val found = server.resolveTargetFile(relativePath)
                promise.resolve(found != null)
                return
            }

            val dirs = if (candidateDirectories.isNotEmpty()) candidateDirectories else getCandidateDirectories()
            for (dir in dirs) {
                val f = File(dir, relativePath.replace('\\', '/'))
                if (f.exists() && f.isFile && f.length() >= 32) {
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Get primary content directory path.
     */
    @ReactMethod
    fun getContentDirectory(promise: Promise) {
        try {
            val dirs = if (candidateDirectories.isNotEmpty()) candidateDirectories else getCandidateDirectories()
            val primary = if (dirs.isNotEmpty()) dirs[0] else File("/sdcard/Download/SSCBoard/offline_content")
            if (!primary.exists()) primary.mkdirs()
            promise.resolve(primary.absolutePath)
        } catch (e: Exception) {
            promise.reject("DIR_ERROR", e.message, e)
        }
    }

    /**
     * List all available encrypted files across all candidate directories.
     */
    @ReactMethod
    fun listOfflineFiles(subfolder: String?, promise: Promise) {
        try {
            val dirs = if (candidateDirectories.isNotEmpty()) candidateDirectories else getCandidateDirectories()
            val fileList = Arguments.createArray()
            val seenNames = HashSet<String>()

            for (baseDir in dirs) {
                if (!baseDir.exists()) continue
                val targetDir = if (!subfolder.isNullOrEmpty()) File(baseDir, subfolder) else baseDir
                if (targetDir.exists() && targetDir.isDirectory) {
                    targetDir.walkTopDown().filter { it.isFile && it.name.endsWith(".enc") }.forEach { file ->
                        val relPath = file.relativeTo(baseDir).path.replace('\\', '/')
                        if (!seenNames.contains(relPath)) {
                            seenNames.add(relPath)
                            val map = Arguments.createMap()
                            map.putString("path", relPath)
                            map.putString("name", file.name)
                            map.putDouble("size", file.length().toDouble())
                            map.putDouble("modified", file.lastModified().toDouble())
                            fileList.pushMap(map)
                        }
                    }
                }
            }

            promise.resolve(fileList)
        } catch (e: Exception) {
            promise.reject("LIST_ERROR", e.message, e)
        }
    }

    /**
     * Generate hardware-bound device fingerprint for client licensing.
     */
    @ReactMethod
    fun getDeviceFingerprint(promise: Promise) {
        try {
            val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
            val manufacturer = Build.MANUFACTURER ?: ""
            val model = Build.MODEL ?: ""
            val board = Build.BOARD ?: ""
            val hardware = Build.HARDWARE ?: ""

            val rawData = "SSC:$androidId:$manufacturer:$model:$board:$hardware"
            val digest = MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(rawData.toByteArray(Charsets.UTF_8))
            val hexString = hashBytes.joinToString("") { "%02x".format(it) }

            promise.resolve(hexString)
        } catch (e: Exception) {
            Log.e(TAG, "Error generating device fingerprint", e)
            promise.resolve("default-device-fp")
        }
    }

    /**
     * Copy text to the Android system clipboard safely.
     */
    @ReactMethod
    fun copyToClipboard(text: String, promise: Promise) {
        try {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
            if (clipboard != null) {
                val clip = android.content.ClipData.newPlainText("SSCBoard", text)
                clipboard.setPrimaryClip(clip)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error copying to clipboard", e)
            promise.reject("CLIPBOARD_ERROR", e.message, e)
        }
    }

    /**
     * In-memory decryption for small files (e.g. manifests or small text assets)
     * Returns Base64 string of the decrypted plaintext without writing to disk.
     */
    @ReactMethod
    fun decryptFileToMemory(
        relativePath: String,
        masterSecret: String,
        clientId: String,
        clientSecret: String,
        promise: Promise
    ) {
        try {
            val server = streamServer
            val targetFile = server?.resolveTargetFile(relativePath) ?: run {
                val dirs = if (candidateDirectories.isNotEmpty()) candidateDirectories else getCandidateDirectories()
                var f: File? = null
                for (dir in dirs) {
                    val candidate = File(dir, relativePath.replace('\\', '/'))
                    if (candidate.exists() && candidate.isFile && candidate.length() >= 32) {
                        f = candidate
                        break
                    }
                }
                f
            }

            if (targetFile == null || !targetFile.exists() || !targetFile.isFile || targetFile.length() < 32) {
                promise.reject("FILE_NOT_FOUND", "Encrypted file not found or invalid: $relativePath")
                return
            }

            val key = DecryptionStreamServer.deriveKey(masterSecret, clientId, clientSecret)
            val raf = RandomAccessFile(targetFile, "r")
            val header = ByteArray(32)
            raf.readFully(header)

            val baseIv = ByteArray(16)
            System.arraycopy(header, 16, baseIv, 0, 16)

            val cipherLength = (targetFile.length() - 32).toInt()
            val cipherText = ByteArray(cipherLength)
            raf.readFully(cipherText)
            raf.close()

            val cipher = Cipher.getInstance("AES/CTR/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), IvParameterSpec(baseIv))
            val decryptedBytes = cipher.doFinal(cipherText)

            val base64 = Base64.encodeToString(decryptedBytes, Base64.NO_WRAP)
            promise.resolve(base64)
        } catch (e: Exception) {
            Log.e(TAG, "Error decrypting file to memory", e)
            promise.reject("DECRYPT_ERROR", e.message, e)
        }
    }
}
