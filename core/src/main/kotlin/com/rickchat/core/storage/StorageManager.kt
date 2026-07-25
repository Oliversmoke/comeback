package com.rickchat.core.storage

import com.google.cloud.storage.BlobId
import com.google.cloud.storage.BlobInfo
import com.google.cloud.storage.Storage
import com.google.cloud.storage.StorageOptions
import com.rickchat.core.config.StorageConfig
import java.io.InputStream
import java.util.UUID

data class FileInfo(
    val id: String,
    val bucket: String,
    val path: String,
    val contentType: String,
    val size: Long,
    val url: String
)

data class UploadRequest(
    val fileName: String,
    val contentType: String,
    val size: Long,
    val data: InputStream,
    var folder: String = "uploads"
)

interface StorageManager {
    suspend fun upload(request: UploadRequest): FileInfo
    suspend fun delete(path: String): Boolean
    suspend fun getUrl(path: String): String
    suspend fun exists(path: String): Boolean
    suspend fun copy(sourcePath: String, destPath: String): FileInfo
}

class GcsStorageManager(private val config: StorageConfig) : StorageManager {
    private val storage: Storage = StorageOptions.getDefaultInstance().service
    private val bucketName = config.bucketName

    override suspend fun upload(request: UploadRequest): FileInfo {
        val fileId = UUID.randomUUID().toString()
        val path = "${request.folder}/$fileId/${request.fileName}"

        val blobId = BlobId.of(bucketName, path)
        val blobInfo = BlobInfo.newBuilder(blobId)
            .setContentType(request.contentType)
            .build()

        val blob = storage.create(blobInfo, request.data.readBytes())

        return FileInfo(
            id = fileId,
            bucket = bucketName,
            path = path,
            contentType = request.contentType,
            size = request.size,
            url = "https://storage.googleapis.com/$bucketName/$path"
        )
    }

    override suspend fun delete(path: String): Boolean {
        val blobId = BlobId.of(bucketName, path)
        return storage.delete(blobId)
    }

    override suspend fun getUrl(path: String): String {
        return "https://storage.googleapis.com/$bucketName/$path"
    }

    override suspend fun exists(path: String): Boolean {
        val blobId = BlobId.of(bucketName, path)
        val blob = storage.get(blobId)
        return blob != null && blob.exists()
    }

    override suspend fun copy(sourcePath: String, destPath: String): FileInfo {
        val sourceBlobId = BlobId.of(bucketName, sourcePath)
        val destBlobId = BlobId.of(bucketName, destPath)
        val copyRequest = Storage.CopyRequest.newBuilder()
            .setSource(sourceBlobId)
            .setTarget(destBlobId)
            .build()
        val result = storage.copy(copyRequest)
        val copied = result.result

        return FileInfo(
            id = UUID.randomUUID().toString(),
            bucket = bucketName,
            path = destPath,
            contentType = copied.contentType,
            size = copied.size,
            url = "https://storage.googleapis.com/$bucketName/$destPath"
        )
    }
}
