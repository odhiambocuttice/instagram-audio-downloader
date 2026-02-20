from rest_framework import serializers
from .models import DownloadTask


class DownloadTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DownloadTask
        fields = [
            "id",
            "url",
            "status",
            "title",
            "uploader",
            "filename",
            "error_message",
            "progress",
            "created_at",
            "completed_at",
        ]
        read_only_fields = fields


class DownloadRequestSerializer(serializers.Serializer):
    urls = serializers.ListField(
        child=serializers.URLField(max_length=500),
        min_length=1,
        max_length=10,
        help_text="List of Instagram video URLs to download audio from.",
    )
