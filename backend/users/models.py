from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier for authentication
    instead of usernames.
    """
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('An email address is required.'))
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model for CampusHub.
    Email replaces username as the primary unique credential.
    """
    username = None
    email = models.EmailField(_('email address'), unique=True, db_index=True)
    full_name = models.CharField(_('full name'), max_length=150, blank=True)

    ROLE_CHOICES = (
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('club_coordinator', 'Club Coordinator'),
        ('department_admin', 'Department Admin'),
        ('tpo_admin', 'TPO Admin'),
        ('college_admin', 'College Admin'),
        ('super_admin', 'Super Admin'),
        # Backward-compatibility choices
        ('club_leader', 'Club Leader (Legacy)'),
        ('admin', 'Admin (Legacy)'),
    )
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='student', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.full_name or self.email} ({self.get_role_display()})"


class StudentProfile(models.Model):
    """
    Extended student attributes including institutional academic and placement metrics.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name=_('user')
    )
    student_id = models.CharField(max_length=32, blank=True, db_index=True)
    department = models.CharField(max_length=100, blank=True, db_index=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    section = models.CharField(max_length=10, blank=True)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, db_index=True)
    backlogs = models.PositiveIntegerField(default=0, db_index=True)
    is_placed = models.BooleanField(default=False, db_index=True)
    resume_url = models.URLField(max_length=500, blank=True)
    bio = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('student profile')
        verbose_name_plural = _('student profiles')

    def __str__(self):
        return f"Profile for {self.user.email} ({self.student_id or 'No ID'})"


class FacultyProfile(models.Model):
    """
    Extended faculty and instructor attributes for KPRIT institutional management.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='faculty_profile',
        verbose_name=_('user')
    )
    employee_id = models.CharField(max_length=32, blank=True, db_index=True)
    department = models.CharField(max_length=100, blank=True, db_index=True)
    designation = models.CharField(max_length=100, default='Assistant Professor')
    specialization = models.CharField(max_length=200, blank=True)
    cabin_location = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    is_hod = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('faculty profile')
        verbose_name_plural = _('faculty profiles')

    def __str__(self):
        return f"Faculty {self.user.full_name or self.user.email} - {self.designation} ({self.department})"

