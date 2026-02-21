from django.urls import path
from . import views

urlpatterns = [
    path("download/", views.submit_download, name="submit-download"),
    path("download/<uuid:task_id>/", views.task_status, name="task-status"),
    path("download/<uuid:task_id>/file/", views.download_file, name="download-file"),
    path("downloads/", views.list_tasks, name="list-tasks"),
    # Audio editor
    path("edit/", views.edit_audio, name="edit-audio"),
    path("edit/<str:edit_id>/file/", views.serve_edit, name="serve-edit"),
    # Emergency
    path("admin/migrate/", views.run_migrations, name="run-migrations"),
]
