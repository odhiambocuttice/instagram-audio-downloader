import uuid
from django.db import models


class DownloadTask(models.Model):
    """Tracks an individual Instagram audio download."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DOWNLOADING = "downloading", "Downloading"
        PROCESSING = "processing", "Processing audio"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.URLField(max_length=500)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    title = models.CharField(max_length=300, blank=True, default="")
    uploader = models.CharField(max_length=200, blank=True, default="")
    filename = models.CharField(max_length=500, blank=True, default="")
    error_message = models.TextField(blank=True, default="")
    progress = models.IntegerField(default=0)  # 0-100
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.url} — {self.status}"
