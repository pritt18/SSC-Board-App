package com.sscboard.learning

import android.util.Log
import java.io.*
import java.math.BigInteger
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.security.MessageDigest
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * DecryptionStreamServer
 *
 * Embedded HTTP server running on 127.0.0.1 (loopback only) that streams
 * AES-256-CTR encrypted video (.mp4.enc) and PDF (.pdf.enc) files on-the-fly.
 *
 * Provides:
 * - Zero temporary decrypted files on storage/disk.
 * - HTTP 206 Partial Content range requests for instant video scrubbing/seeking.
 * - Localhost only binding + random session token authentication.
 * - Supports searching across multiple designated offline content directories
 *   (app external files, Downloads, Documents, SD card).
 */
class DecryptionStreamServer(
    private val allowedBaseDirectories: List<File>,
    private val encryptionKey: ByteArray
) {
    companion object {
        private const val TAG = "DecryptionStreamServer"
        private const val HEADER_SIZE = 32
        private val MAGIC_BYTES = byteArrayOf(0x53, 0x53, 0x43, 0x45) // "SSCE"

        /**
         * Derive a 32-byte (256-bit) AES key from master secret, client ID, and client secret.
         */
        fun deriveKey(masterSecret: String, clientId: String, clientSecret: String): ByteArray {
            val combined = "$masterSecret:$clientId:$clientSecret"
            val digest = MessageDigest.getInstance("SHA-256")
            return digest.digest(combined.toByteArray(Charsets.UTF_8))
        }
    }

    private var serverSocket: ServerSocket? = null
    private var isRunning = false
    private val threadPool: ExecutorService = Executors.newFixedThreadPool(4)
    val sessionToken: String = UUID.randomUUID().toString()
    var port: Int = 0
        private set

    @Synchronized
    fun start(): Int {
        if (isRunning && serverSocket != null && !serverSocket!!.isClosed) {
            return port
        }

        try {
            // Bind strictly to loopback 127.0.0.1 on an OS-assigned ephemeral port
            serverSocket = ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"))
            port = serverSocket!!.localPort
            isRunning = true

            Log.i(TAG, "DecryptionStreamServer started on 127.0.0.1:$port (token=$sessionToken)")

            threadPool.execute {
                acceptConnections()
            }

            return port
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start DecryptionStreamServer", e)
            throw e
        }
    }

    @Synchronized
    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            Log.w(TAG, "Error closing server socket", e)
        }
        serverSocket = null
        Log.i(TAG, "DecryptionStreamServer stopped")
    }

    private fun acceptConnections() {
        while (isRunning) {
            try {
                val clientSocket = serverSocket?.accept() ?: break
                threadPool.execute {
                    handleClient(clientSocket)
                }
            } catch (e: Exception) {
                if (!isRunning) break
                Log.w(TAG, "Error accepting client connection", e)
            }
        }
    }

    private fun handleClient(socket: Socket) {
        try {
            // Verify client IP is 127.0.0.1
            val clientIp = socket.inetAddress.hostAddress
            if (clientIp != "127.0.0.1" && clientIp != "localhost") {
                socket.close()
                return
            }

            val inputStream = BufferedInputStream(socket.getInputStream())
            val outputStream = BufferedOutputStream(socket.getOutputStream())

            val reader = BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
            val requestLine = reader.readLine() ?: run {
                socket.close()
                return
            }

            val parts = requestLine.split(" ")
            if (parts.size < 2 || parts[0].uppercase(Locale.ROOT) != "GET") {
                sendError(outputStream, 405, "Method Not Allowed")
                socket.close()
                return
            }

            val rawUri = parts[1]
            val headers = HashMap<String, String>()
            var line: String? = reader.readLine()
            while (!line.isNullOrEmpty()) {
                val colonIdx = line.indexOf(':')
                if (colonIdx > 0) {
                    val key = line.substring(0, colonIdx).trim().lowercase(Locale.ROOT)
                    val value = line.substring(colonIdx + 1).trim()
                    headers[key] = value
                }
                line = reader.readLine()
            }

            handleRequest(rawUri, headers, outputStream)
            socket.close()
        } catch (e: Exception) {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    fun resolveTargetFile(relativePath: String): File? {
        val cleanPath = relativePath.trim().replace('\\', '/')
        for (baseDir in allowedBaseDirectories) {
            if (!baseDir.exists()) continue
            try {
                val candidate = File(baseDir, cleanPath)
                if (candidate.exists() && candidate.isFile && candidate.length() >= HEADER_SIZE) {
                    return candidate
                }
            } catch (_: Exception) {}
        }
        return null
    }

    private fun handleRequest(rawUri: String, headers: Map<String, String>, out: OutputStream) {
        val queryIdx = rawUri.indexOf('?')
        val path = if (queryIdx >= 0) rawUri.substring(0, queryIdx) else rawUri
        val queryString = if (queryIdx >= 0) rawUri.substring(queryIdx + 1) else ""

        val queryParams = parseQuery(queryString)

        if (path == "/ping") {
            val response = "{\"status\":\"ok\",\"port\":$port}"
            val bytes = response.toByteArray(Charsets.UTF_8)
            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Content-Length: ${bytes.size}\r\n" +
                    "Connection: close\r\n\r\n"
            out.write(header.toByteArray(Charsets.UTF_8))
            out.write(bytes)
            out.flush()
            return
        }

        // Validate session token
        val token = queryParams["token"]
        if (token != sessionToken) {
            sendError(out, 403, "Forbidden - Invalid session token")
            return
        }

        val relativePath = queryParams["file"]
        if (relativePath.isNullOrEmpty()) {
            sendError(out, 400, "Bad Request - Missing 'file' parameter")
            return
        }

        // Search for file across candidate directories
        val requestedFile = resolveTargetFile(relativePath)
        if (requestedFile == null || !requestedFile.exists() || !requestedFile.isFile) {
            sendError(out, 404, "Not Found - Content file not found: $relativePath")
            return
        }

        val fileLength = requestedFile.length()
        if (fileLength < HEADER_SIZE) {
            sendError(out, 500, "Internal Server Error - Invalid encrypted file size")
            return
        }

        val originalSize = fileLength - HEADER_SIZE

        // Determine MIME type
        val lowerName = requestedFile.name.lowercase(Locale.ROOT)
        val contentType = when {
            lowerName.contains(".mp4") -> "video/mp4"
            lowerName.contains(".pdf") -> "application/pdf"
            lowerName.contains(".json") -> "application/json"
            else -> "application/octet-stream"
        }

        // Parse Range header if present
        val rangeHeader = headers["range"]
        var rangeStart: Long = 0
        var rangeEnd: Long = originalSize - 1

        val isRangeRequest = if (!rangeHeader.isNullOrEmpty() && rangeHeader.startsWith("bytes=")) {
            val spec = rangeHeader.substring(6).trim()
            val dashIdx = spec.indexOf('-')
            if (dashIdx >= 0) {
                val startStr = spec.substring(0, dashIdx).trim()
                val endStr = spec.substring(dashIdx + 1).trim()
                if (startStr.isNotEmpty()) {
                    rangeStart = startStr.toLongOrNull() ?: 0L
                }
                if (endStr.isNotEmpty()) {
                    rangeEnd = endStr.toLongOrNull() ?: (originalSize - 1)
                }
                if (rangeEnd >= originalSize) {
                    rangeEnd = originalSize - 1
                }
                true
            } else {
                false
            }
        } else {
            false
        }

        if (rangeStart > rangeEnd || rangeStart >= originalSize) {
            val errorHeader = "HTTP/1.1 416 Range Not Satisfiable\r\n" +
                    "Content-Range: bytes */$originalSize\r\n" +
                    "Connection: close\r\n\r\n"
            out.write(errorHeader.toByteArray(Charsets.UTF_8))
            out.flush()
            return
        }

        val contentLength = rangeEnd - rangeStart + 1

        val statusLine = if (isRangeRequest) "HTTP/1.1 206 Partial Content" else "HTTP/1.1 200 OK"
        val responseHeaders = StringBuilder()
        responseHeaders.append("$statusLine\r\n")
        responseHeaders.append("Content-Type: $contentType\r\n")
        responseHeaders.append("Accept-Ranges: bytes\r\n")
        responseHeaders.append("Content-Length: $contentLength\r\n")
        if (isRangeRequest) {
            responseHeaders.append("Content-Range: bytes $rangeStart-$rangeEnd/$originalSize\r\n")
        }
        responseHeaders.append("Access-Control-Allow-Origin: *\r\n")
        responseHeaders.append("Connection: close\r\n\r\n")

        out.write(responseHeaders.toString().toByteArray(Charsets.UTF_8))
        out.flush()

        // Stream decrypted payload
        streamDecryptedRange(requestedFile, rangeStart, contentLength, out)
    }

    private fun streamDecryptedRange(
        file: File,
        rangeStart: Long,
        totalBytesToSend: Long,
        out: OutputStream
    ) {
        val raf = RandomAccessFile(file, "r")
        try {
            // Read 32-byte header
            raf.seek(0)
            val header = ByteArray(HEADER_SIZE)
            raf.readFully(header)

            // Validate magic bytes
            for (i in 0 until 4) {
                if (header[i] != MAGIC_BYTES[i]) {
                    Log.e(TAG, "Invalid magic bytes in encrypted file: ${file.name}")
                    return
                }
            }

            // Extract 16-byte base IV (bytes 16..31)
            val baseIv = ByteArray(16)
            System.arraycopy(header, 16, baseIv, 0, 16)

            // AES-CTR: compute block index and offset
            val blockIndex = rangeStart / 16
            val blockOffset = (rangeStart % 16).toInt()

            val blockIv = computeBlockIv(baseIv, blockIndex)

            val cipher = Cipher.getInstance("AES/CTR/NoPadding")
            val secretKeySpec = SecretKeySpec(encryptionKey, "AES")
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, IvParameterSpec(blockIv))

            // Seek in file to corresponding 16-byte aligned block (after 32-byte header)
            val fileOffset = HEADER_SIZE + (blockIndex * 16)
            raf.seek(fileOffset)

            var remaining = totalBytesToSend
            var isFirstBlock = true
            val buffer = ByteArray(65536)

            while (remaining > 0) {
                val toRead = Math.min(buffer.size.toLong(), remaining + if (isFirstBlock) blockOffset else 0).toInt()
                val readCount = raf.read(buffer, 0, toRead)
                if (readCount <= 0) break

                val decrypted = cipher.update(buffer, 0, readCount) ?: ByteArray(0)

                var offset = 0
                var len = decrypted.size
                if (isFirstBlock) {
                    offset = blockOffset
                    len -= blockOffset
                    isFirstBlock = false
                }

                if (len > remaining) {
                    len = remaining.toInt()
                }

                if (len > 0) {
                    out.write(decrypted, offset, len)
                    remaining -= len
                }
            }
            out.flush()
        } finally {
            try { raf.close() } catch (_: Exception) {}
        }
    }

    /**
     * Compute updated IV for AES-CTR seeking by adding blockIndex to 128-bit big-endian IV.
     */
    private fun computeBlockIv(baseIv: ByteArray, blockIndex: Long): ByteArray {
        val base = BigInteger(1, baseIv)
        val added = base.add(BigInteger.valueOf(blockIndex))
        val result = added.toByteArray()
        val out = ByteArray(16)
        if (result.size >= 16) {
            System.arraycopy(result, result.size - 16, out, 0, 16)
        } else {
            System.arraycopy(result, 0, out, 16 - result.size, result.size)
        }
        return out
    }

    private fun sendError(out: OutputStream, code: Int, message: String) {
        try {
            val body = "{\"error\":\"$message\",\"code\":$code}".toByteArray(Charsets.UTF_8)
            val header = "HTTP/1.1 $code $message\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Content-Length: ${body.size}\r\n" +
                    "Connection: close\r\n\r\n"
            out.write(header.toByteArray(Charsets.UTF_8))
            out.write(body)
            out.flush()
        } catch (_: Exception) {}
    }

    private fun parseQuery(query: String): Map<String, String> {
        val map = HashMap<String, String>()
        if (query.isEmpty()) return map
        val pairs = query.split("&")
        for (pair in pairs) {
            val idx = pair.indexOf('=')
            if (idx > 0) {
                val key = URLDecoder.decode(pair.substring(0, idx), "UTF-8")
                val rawVal = pair.substring(idx + 1)
                // Decode query value once
                val value = try {
                    URLDecoder.decode(rawVal, "UTF-8")
                } catch (_: Exception) {
                    rawVal
                }
                map[key] = value
            }
        }
        return map
    }
}
