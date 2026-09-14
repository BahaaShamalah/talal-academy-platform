<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AbsenceAlertController;
use App\Http\Controllers\Api\AbsenceAlertThresholdController;
use App\Http\Controllers\Api\AcademicPeriodController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\ClassScheduleController;
use App\Http\Controllers\Api\ClassSessionController;
use App\Http\Controllers\Api\CompensationComponentController;
use App\Http\Controllers\Api\ContactMessageController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\ClassOfferingController;
use App\Http\Controllers\Api\ClassOfferingWaitingListController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\EducationalMaterialController;
use App\Http\Controllers\Api\EducationalStageController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\EvaluationController;
use App\Http\Controllers\Api\ExamController;
use App\Http\Controllers\Api\FamilyDiscountRuleController;
use App\Http\Controllers\Api\FinancialReportController;
use App\Http\Controllers\Api\GradeController;
use App\Http\Controllers\Api\GradeSectionController;
use App\Http\Controllers\Api\GuardianAuthController;
use App\Http\Controllers\Api\GuardianController;
use App\Http\Controllers\Api\GuardianCreditController;
use App\Http\Controllers\Api\GuardianEducationalMaterialController;
use App\Http\Controllers\Api\GuardianEvaluationController;
use App\Http\Controllers\Api\GuardianExamResultController;
use App\Http\Controllers\Api\GuardianInvoiceController;
use App\Http\Controllers\Api\GuardianPrivateLessonBookingController;
use App\Http\Controllers\Api\GuardianStatementController;
use App\Http\Controllers\Api\GuardianStudentController;
use App\Http\Controllers\Api\GuardianSubscriptionController;
use App\Http\Controllers\Api\HallController;
use App\Http\Controllers\Api\InstallmentTemplateController;
use App\Http\Controllers\Api\InstituteSettingController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\InvoiceInstallmentController;
use App\Http\Controllers\Api\InvoiceRefundController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\MarketingSectionController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\MyFatoorahController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationTemplateController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\PlanDurationController;
use App\Http\Controllers\Api\PrivateLessonBookingController;
use App\Http\Controllers\Api\PrivateLessonInquiryController;
use App\Http\Controllers\Api\PrivateLessonOfferController;
use App\Http\Controllers\Api\PrivateLessonSlotController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductTypeController;
use App\Http\Controllers\Api\Public\PublicContactMessageController;
use App\Http\Controllers\Api\Public\PublicEducationalStageController;
use App\Http\Controllers\Api\Public\PublicGradeController;
use App\Http\Controllers\Api\Public\PublicMarketingSectionController;
use App\Http\Controllers\Api\Public\PublicPlanController;
use App\Http\Controllers\Api\Public\PublicPrivateLessonInquiryController;
use App\Http\Controllers\Api\Public\PublicPrivateLessonOfferController;
use App\Http\Controllers\Api\Public\PublicPrivateLessonPeriodController;
use App\Http\Controllers\Api\Public\PublicSeoSettingsController;
use App\Http\Controllers\Api\Public\PublicTrackVisitController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StaffAttendanceController;
use App\Http\Controllers\Api\StaffProfileController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\StudentSubscriptionController;
use App\Http\Controllers\Api\SubjectController;
use App\Http\Controllers\Api\SubscriptionCancelController;
use App\Http\Controllers\Api\SubscriptionChangeController;
use App\Http\Controllers\Api\SubscriptionFreezeController;
use App\Http\Controllers\Api\SupportTicketController;
use App\Http\Controllers\Api\TeacherController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::prefix('public')->group(function () {
        Route::get('stages', [PublicEducationalStageController::class, 'index']);
        Route::get('grades', [PublicGradeController::class, 'index']);
        Route::get('grades/{grade}/subjects', [PublicGradeController::class, 'subjects']);
        Route::get('plans', [PublicPlanController::class, 'index']);
        Route::get('marketing-sections', [PublicMarketingSectionController::class, 'index']);
        Route::get('private-lesson-offers', [PublicPrivateLessonOfferController::class, 'index']);
        Route::get('private-lesson-offers/{offer}/slots', [PublicPrivateLessonOfferController::class, 'slots']);
        Route::get('private-lesson-periods', [PublicPrivateLessonPeriodController::class, 'index']);
        Route::get('seo-settings', [PublicSeoSettingsController::class, 'show']);
        Route::post('track-visit', [PublicTrackVisitController::class, 'store'])
            ->middleware('throttle:30,1');
        Route::post('private-lesson-inquiries', [PublicPrivateLessonInquiryController::class, 'store'])
            ->middleware('throttle:8,1');
        Route::post('contact-messages', [PublicContactMessageController::class, 'store'])
            ->middleware('throttle:8,1');
    });

    Route::prefix('guardian/auth')->group(function () {
        Route::post('otp/request', [GuardianAuthController::class, 'requestOtp'])
            ->middleware('throttle:8,1');
        Route::post('otp/verify', [GuardianAuthController::class, 'verifyOtp'])
            ->middleware('throttle:8,1');
    });

    Route::middleware('auth:guardian')->prefix('guardian')->group(function () {
        Route::get('me', [GuardianAuthController::class, 'me']);
        Route::put('me', [GuardianAuthController::class, 'updateMe']);
        Route::post('me/avatar', [GuardianAuthController::class, 'uploadAvatar']);
        Route::delete('me/avatar', [GuardianAuthController::class, 'deleteAvatar']);
        Route::post('logout', [GuardianAuthController::class, 'logout']);
        Route::get('me/credit-balance', [GuardianCreditController::class, 'me']);
        Route::get('me/statement', [GuardianStatementController::class, 'me']);
        Route::get('students', [GuardianStudentController::class, 'index']);
        Route::post('students', [GuardianStudentController::class, 'store']);
        Route::get('students/{student}', [GuardianStudentController::class, 'show']);
        Route::put('students/{student}', [GuardianStudentController::class, 'update']);
        Route::patch('students/{student}', [GuardianStudentController::class, 'update']);
        Route::post('students/{student}/subscribe', [GuardianSubscriptionController::class, 'store']);
        Route::get('students/{student}/schedule', [GuardianStudentController::class, 'schedule']);
        Route::get('students/{student}/attendance-summary', [GuardianStudentController::class, 'attendanceSummary']);
        Route::post('coupons/validate', [GuardianSubscriptionController::class, 'validateCoupon']);
        Route::post('private-lesson-bookings', [GuardianPrivateLessonBookingController::class, 'store']);
        Route::get('students/{student}/private-lesson-bookings', [GuardianPrivateLessonBookingController::class, 'index']);
        Route::get('students/{student}/evaluations', [GuardianEvaluationController::class, 'index']);
        Route::get('students/{student}/educational-materials', [GuardianEducationalMaterialController::class, 'index']);
        Route::get('students/{student}/exam-results', [GuardianExamResultController::class, 'index']);
        Route::get('invoices', [GuardianInvoiceController::class, 'index']);
        Route::get('invoices/{invoice}', [GuardianInvoiceController::class, 'show']);
        Route::get('invoices/{invoice}/pdf', [GuardianInvoiceController::class, 'pdf']);
        Route::get('invoices/{invoice}/html', [GuardianInvoiceController::class, 'html']);
        Route::post('invoices/{invoice}/pay', [GuardianInvoiceController::class, 'pay']);
        Route::get('invoices/{invoice}/installments', [InvoiceInstallmentController::class, 'index']);
        Route::post('invoices/{invoice}/installments/{installment}/pay', [InvoiceInstallmentController::class, 'pay']);

        Route::get('support-tickets', [SupportTicketController::class, 'guardianIndex']);
        Route::post('support-tickets', [SupportTicketController::class, 'guardianStore']);
        Route::get('support-tickets/{support_ticket}', [SupportTicketController::class, 'guardianShow']);
        Route::post('support-tickets/{support_ticket}/reply', [SupportTicketController::class, 'guardianReply']);

        Route::get('me/notifications', [NotificationController::class, 'guardianIndex']);
        Route::post('notifications/{notification}/mark-read', [NotificationController::class, 'guardianMarkRead']);
    });

    // MyFatoorah server-to-server webhook (HMAC auth only — no Sanctum).
    Route::post('/webhooks/myfatoorah', [MyFatoorahController::class, 'webhook'])
        ->middleware('throttle:60,1');
    // Public: verified via MyFatoorah GetPaymentStatus (browser return may lack guardian session).
    Route::post('/payments/myfatoorah/confirm', [MyFatoorahController::class, 'confirm'])
        ->middleware('throttle:20,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('me/notifications', [NotificationController::class, 'meIndex']);
        Route::post('me/notifications/{notification}/mark-read', [NotificationController::class, 'meMarkRead']);

        Route::middleware('permission:notifications.manage')->group(function () {
            Route::get('notification-templates', [NotificationTemplateController::class, 'index']);
            Route::post('notification-templates', [NotificationTemplateController::class, 'store']);
            Route::get('notification-templates/{notification_template}', [NotificationTemplateController::class, 'show']);
            Route::put('notification-templates/{notification_template}', [NotificationTemplateController::class, 'update']);
            Route::patch('notification-templates/{notification_template}', [NotificationTemplateController::class, 'update']);
            Route::delete('notification-templates/{notification_template}', [NotificationTemplateController::class, 'destroy']);
        });

        Route::middleware('permission:audit-logs.view')->group(function () {
            Route::get('audit-logs', [AuditLogController::class, 'index']);
            Route::get('audit-logs/subject/{subject_type}/{subject_id}', [AuditLogController::class, 'forSubject']);
        });

        Route::middleware('permission:analytics.view')->prefix('analytics')->group(function () {
            Route::get('overview', [AnalyticsController::class, 'overview']);
            Route::get('timeseries', [AnalyticsController::class, 'timeseries']);
            Route::get('top-pages', [AnalyticsController::class, 'topPages']);
            Route::get('top-referrers', [AnalyticsController::class, 'topReferrers']);
            Route::get('by-country', [AnalyticsController::class, 'byCountry']);
            Route::get('by-device', [AnalyticsController::class, 'byDevice']);
        });

        Route::get('media', [MediaController::class, 'index']);
        Route::post('media', [MediaController::class, 'store']);
        Route::patch('media/{media}', [MediaController::class, 'update']);
        Route::put('media/{media}', [MediaController::class, 'update']);
        Route::delete('media/{media}', [MediaController::class, 'destroy']);

        Route::get('/me/payroll-items', [PayrollController::class, 'myItems']);
        Route::get('/me/groups', [MeController::class, 'groups']);
        Route::get('/me/offerings', [MeController::class, 'groups']);
        Route::get('/me/teaching-schedule', [MeController::class, 'teachingSchedule']);
        Route::get('/me/teaching-schedule/pdf', [MeController::class, 'teachingSchedulePdf']);
        Route::get('/me/students', [MeController::class, 'students']);
        Route::get('/me/evaluations', [MeController::class, 'evaluations']);
        Route::get('/me/leave-balances', [MeController::class, 'leaveBalances']);
        Route::get('/me/leave-requests', [MeController::class, 'leaveRequests']);

        Route::get('/dashboard/overview', [DashboardController::class, 'overview']);

        Route::post('staff-attendance/check-in', [StaffAttendanceController::class, 'checkIn']);
        Route::post('staff-attendance/check-out', [StaffAttendanceController::class, 'checkOut']);

        Route::middleware('permission:staff-attendance.view')->group(function () {
            Route::get('staff-attendance', [StaffAttendanceController::class, 'index']);
            Route::get('staff-attendance/summary', [StaffAttendanceController::class, 'summary']);
            Route::get('staff-attendance/{staff_attendance_record}', [StaffAttendanceController::class, 'show']);
        });
        Route::middleware('permission:staff-attendance.manage')->group(function () {
            Route::post('staff-attendance', [StaffAttendanceController::class, 'store']);
            Route::put('staff-attendance/{staff_attendance_record}', [StaffAttendanceController::class, 'update']);
            Route::patch('staff-attendance/{staff_attendance_record}', [StaffAttendanceController::class, 'update']);
            Route::delete('staff-attendance/{staff_attendance_record}', [StaffAttendanceController::class, 'destroy']);
        });

        Route::post('leave-requests', [LeaveRequestController::class, 'store']);
        Route::get('users/{user}/leave-balances', [LeaveRequestController::class, 'balances']);
        Route::get('leave-types', [LeaveTypeController::class, 'index']);
        Route::get('leave-types/{leave_type}', [LeaveTypeController::class, 'show']);

        Route::middleware('permission:leaves.view')->group(function () {
            Route::get('leave-requests', [LeaveRequestController::class, 'index']);
            Route::get('leave-requests/{leave_request}/substitute-suggestions', [LeaveRequestController::class, 'substituteSuggestions']);
        });
        Route::middleware('permission:leaves.manage')->group(function () {
            Route::post('leave-requests/{leave_request}/review', [LeaveRequestController::class, 'review']);
            Route::post('sessions/{session}/assign-substitute', [LeaveRequestController::class, 'assignSubstitute']);
            Route::post('leave-types', [LeaveTypeController::class, 'store']);
            Route::put('leave-types/{leave_type}', [LeaveTypeController::class, 'update']);
            Route::patch('leave-types/{leave_type}', [LeaveTypeController::class, 'update']);
            Route::delete('leave-types/{leave_type}', [LeaveTypeController::class, 'destroy']);
        });

        Route::middleware('permission:support-tickets.view')->group(function () {
            Route::get('support-tickets', [SupportTicketController::class, 'index']);
            Route::get('support-tickets/{support_ticket}', [SupportTicketController::class, 'show']);
            Route::get('contact-messages', [ContactMessageController::class, 'index']);
            Route::get('contact-messages/{contact_message}', [ContactMessageController::class, 'show']);
        });
        Route::middleware('permission:support-tickets.manage')->group(function () {
            Route::post('support-tickets/{support_ticket}/assign', [SupportTicketController::class, 'assign']);
            Route::post('support-tickets/{support_ticket}/reply', [SupportTicketController::class, 'reply']);
            Route::post('support-tickets/{support_ticket}/close', [SupportTicketController::class, 'close']);
            Route::put('contact-messages/{contact_message}', [ContactMessageController::class, 'update']);
            Route::patch('contact-messages/{contact_message}', [ContactMessageController::class, 'update']);
        });

        Route::get('/users', [UserController::class, 'index'])
            ->middleware('permission:users.view');
        Route::get('/users/{user}/branches', [UserController::class, 'branches'])
            ->middleware('permission:users.view');
        Route::middleware('permission:users.manage')->group(function () {
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{user}', [UserController::class, 'update']);
            Route::patch('/users/{user}', [UserController::class, 'update']);
            Route::delete('/users/{user}', [UserController::class, 'destroy']);
            Route::put('/users/{user}/branches', [UserController::class, 'syncBranches']);
            Route::get('/users/{user}/staff-profile', [StaffProfileController::class, 'show']);
            Route::put('/users/{user}/staff-profile', [StaffProfileController::class, 'upsert']);
            Route::put('/users/{user}/staff-profile/qualifications', [StaffProfileController::class, 'syncQualifications']);
            Route::post('/users/{user}/staff-profile/documents', [StaffProfileController::class, 'storeDocument']);
            Route::delete('/staff-documents/{document}', [StaffProfileController::class, 'destroyDocument']);
        });

        Route::get('/permissions', [PermissionController::class, 'index'])
            ->middleware('permission:roles.view');
        Route::middleware('permission:roles.view')->group(function () {
            Route::get('/roles', [RoleController::class, 'index']);
            Route::get('/roles/{role}', [RoleController::class, 'show']);
        });
        Route::middleware('permission:roles.manage')->group(function () {
            Route::post('/roles', [RoleController::class, 'store']);
            Route::put('/roles/{role}', [RoleController::class, 'update']);
            Route::patch('/roles/{role}', [RoleController::class, 'update']);
            Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
            Route::put('/users/{user}/roles', [UserController::class, 'syncRoles']);
        });

        Route::get('/teachers', [TeacherController::class, 'index'])
            ->middleware('permission:teachers.view');

        Route::middleware('permission:teachers.manage')->group(function () {
            Route::post('/teachers', [TeacherController::class, 'store']);
            Route::put('/teachers/{user}', [TeacherController::class, 'update']);
            Route::patch('/teachers/{user}', [TeacherController::class, 'update']);
            Route::delete('/teachers/{user}', [TeacherController::class, 'destroy']);
            Route::put('/teachers/{user}/subjects', [TeacherController::class, 'syncSubjects']);
            Route::get('/users/{user}/compensation-components', [CompensationComponentController::class, 'index']);
            Route::get('/users/{user}/compensation-components/history', [CompensationComponentController::class, 'history']);
            Route::post('/users/{user}/compensation-components', [CompensationComponentController::class, 'store']);
            Route::put('/users/{user}/compensation-components/{component}', [CompensationComponentController::class, 'update']);
            Route::patch('/users/{user}/compensation-components/{component}', [CompensationComponentController::class, 'update']);
            Route::delete('/users/{user}/compensation-components/{component}', [CompensationComponentController::class, 'destroy']);
        });

        Route::middleware('permission:payroll.view')->group(function () {
            Route::get('payroll-runs', [PayrollController::class, 'indexRuns']);
            Route::get('payroll-runs/{payroll_run}', [PayrollController::class, 'showRun']);
            Route::get('payroll-runs/{payroll_run}/pdf', [PayrollController::class, 'pdf']);
        });
        Route::middleware('permission:payroll.manage')->group(function () {
            Route::post('payroll-runs', [PayrollController::class, 'storeRun']);
            Route::put('payroll-runs/{payroll_run}/items/{payroll_item}', [PayrollController::class, 'updateItem']);
            Route::post('payroll-runs/{payroll_run}/finalize', [PayrollController::class, 'finalize']);
        });

        Route::middleware('permission:branches.view')->group(function () {
            Route::get('branches', [BranchController::class, 'index']);
            Route::get('branches/{branch}', [BranchController::class, 'show']);
        });
        Route::middleware('permission:branches.manage')->group(function () {
            Route::post('branches', [BranchController::class, 'store']);
            Route::put('branches/{branch}', [BranchController::class, 'update']);
            Route::patch('branches/{branch}', [BranchController::class, 'update']);
            Route::delete('branches/{branch}', [BranchController::class, 'destroy']);
        });

        Route::middleware('permission:halls.view')->group(function () {
            Route::get('halls', [HallController::class, 'index']);
            Route::get('halls/{hall}', [HallController::class, 'show']);
        });
        Route::middleware('permission:halls.manage')->group(function () {
            Route::post('halls', [HallController::class, 'store']);
            Route::put('halls/{hall}', [HallController::class, 'update']);
            Route::patch('halls/{hall}', [HallController::class, 'update']);
            Route::delete('halls/{hall}', [HallController::class, 'destroy']);
        });

        Route::middleware('permission:subjects.view')->group(function () {
            Route::get('subjects', [SubjectController::class, 'index']);
            Route::get('subjects/{subject}', [SubjectController::class, 'show']);
        });
        Route::middleware('permission:subjects.manage')->group(function () {
            Route::post('subjects', [SubjectController::class, 'store']);
            Route::put('subjects/{subject}', [SubjectController::class, 'update']);
            Route::patch('subjects/{subject}', [SubjectController::class, 'update']);
            Route::delete('subjects/{subject}', [SubjectController::class, 'destroy']);
        });

        Route::middleware('permission:stages.view')->group(function () {
            Route::get('educational-stages', [EducationalStageController::class, 'index']);
            Route::get('educational-stages/{educational_stage}', [EducationalStageController::class, 'show']);
        });
        Route::middleware('permission:stages.manage')->group(function () {
            Route::post('educational-stages', [EducationalStageController::class, 'store']);
            Route::put('educational-stages/{educational_stage}', [EducationalStageController::class, 'update']);
            Route::patch('educational-stages/{educational_stage}', [EducationalStageController::class, 'update']);
            Route::delete('educational-stages/{educational_stage}', [EducationalStageController::class, 'destroy']);
        });

        Route::middleware('permission:grades.view')->group(function () {
            Route::get('grades', [GradeController::class, 'index']);
            Route::get('grades/{grade}', [GradeController::class, 'show']);
        });
        Route::middleware('permission:grades.manage')->group(function () {
            Route::post('grades', [GradeController::class, 'store']);
            Route::put('grades/{grade}', [GradeController::class, 'update']);
            Route::patch('grades/{grade}', [GradeController::class, 'update']);
            Route::delete('grades/{grade}', [GradeController::class, 'destroy']);
            Route::post('grades/{grade}/subjects/{subject}', [GradeController::class, 'attachSubject']);
            Route::delete('grades/{grade}/subjects/{subject}', [GradeController::class, 'detachSubject']);
        });

        Route::middleware('permission:periods.view')->group(function () {
            Route::get('academic-periods', [AcademicPeriodController::class, 'index']);
            Route::get('academic-periods/{period}', [AcademicPeriodController::class, 'show']);
        });
        Route::middleware('permission:periods.manage')->group(function () {
            Route::post('academic-periods', [AcademicPeriodController::class, 'store']);
            Route::post('academic-periods/{period}/activate', [AcademicPeriodController::class, 'activate']);
            Route::post('academic-periods/{period}/transition', [AcademicPeriodController::class, 'transition']);
            Route::put('academic-periods/{period}', [AcademicPeriodController::class, 'update']);
            Route::patch('academic-periods/{period}', [AcademicPeriodController::class, 'update']);
            Route::delete('academic-periods/{period}', [AcademicPeriodController::class, 'destroy']);
        });

        Route::middleware('permission:durations.view')->group(function () {
            Route::get('plan-durations', [PlanDurationController::class, 'index']);
            Route::get('plan-durations/{plan_duration}', [PlanDurationController::class, 'show']);
        });
        Route::middleware('permission:durations.manage')->group(function () {
            Route::post('plan-durations', [PlanDurationController::class, 'store']);
            Route::put('plan-durations/{plan_duration}', [PlanDurationController::class, 'update']);
            Route::patch('plan-durations/{plan_duration}', [PlanDurationController::class, 'update']);
            Route::delete('plan-durations/{plan_duration}', [PlanDurationController::class, 'destroy']);
        });

        Route::middleware('permission:product-types.view')->group(function () {
            Route::get('product-types', [ProductTypeController::class, 'index']);
            Route::get('product-types/{product_type}', [ProductTypeController::class, 'show']);
        });
        Route::middleware('permission:product-types.manage')->group(function () {
            Route::post('product-types', [ProductTypeController::class, 'store']);
            Route::put('product-types/{product_type}', [ProductTypeController::class, 'update']);
            Route::patch('product-types/{product_type}', [ProductTypeController::class, 'update']);
            Route::delete('product-types/{product_type}', [ProductTypeController::class, 'destroy']);
        });

        Route::middleware('permission:plans.view')->group(function () {
            Route::get('plans', [PlanController::class, 'index']);
            Route::get('plans/{plan}', [PlanController::class, 'show']);
        });
        Route::middleware('permission:plans.manage')->group(function () {
            Route::post('plans', [PlanController::class, 'store']);
            Route::put('plans/{plan}', [PlanController::class, 'update']);
            Route::patch('plans/{plan}', [PlanController::class, 'update']);
            Route::delete('plans/{plan}', [PlanController::class, 'destroy']);
        });

        Route::middleware('role_or_permission:course-groups.view|enrollments.view|enrollments.manage')->group(function () {
            Route::get('grade-sections', [GradeSectionController::class, 'index']);
            Route::get('grade-sections/{grade_section}', [GradeSectionController::class, 'show']);
            Route::get('grade-sections/{grade_section}/students', [GradeSectionController::class, 'students']);
            Route::get('class-offerings', [ClassOfferingController::class, 'index']);
            Route::get('class-offerings/{class_offering}', [ClassOfferingController::class, 'show']);
            Route::get('schedule-grid', [\App\Http\Controllers\Api\ScheduleGridController::class, 'index']);
            Route::get('schedule-exports/pdf', [\App\Http\Controllers\Api\ScheduleExportController::class, 'pdf']);
        });
        Route::middleware('permission:course-groups.manage')->group(function () {
            Route::post('grade-sections', [GradeSectionController::class, 'store']);
            Route::put('grade-sections/{grade_section}', [GradeSectionController::class, 'update']);
            Route::patch('grade-sections/{grade_section}', [GradeSectionController::class, 'update']);
            Route::delete('grade-sections/{grade_section}', [GradeSectionController::class, 'destroy']);
            Route::post('class-offerings/bulk-import', [ClassOfferingController::class, 'bulkImport']);
            Route::post('class-offerings', [ClassOfferingController::class, 'store']);
            Route::put('class-offerings/{class_offering}', [ClassOfferingController::class, 'update']);
            Route::patch('class-offerings/{class_offering}', [ClassOfferingController::class, 'update']);
            Route::delete('class-offerings/{class_offering}', [ClassOfferingController::class, 'destroy']);
        });

        Route::middleware('permission:sessions.view')->group(function () {
            Route::get('class-offerings/{class_offering}/sessions', [ClassSessionController::class, 'index']);
            Route::get('sessions/{session}/roster', [ClassSessionController::class, 'roster']);
        });
        Route::middleware('permission:sessions.manage')->group(function () {
            Route::post('class-offerings/{class_offering}/generate-sessions', [ClassSessionController::class, 'generate']);
            Route::put('sessions/{session}', [ClassSessionController::class, 'update']);
            Route::put('sessions/{session}/cancel', [ClassSessionController::class, 'cancel']);
            Route::post('class-offerings/{class_offering}/makeup-session', [ClassSessionController::class, 'storeMakeup']);
        });
        Route::middleware('permission:attendance.view')->group(function () {
            Route::get('students/{student}/attendance-summary', [ClassSessionController::class, 'studentSummary']);
            Route::get('absence-alerts', [AbsenceAlertController::class, 'index']);
            Route::get('attendance/board', [\App\Http\Controllers\Api\AttendanceBoardController::class, 'show']);
        });
        Route::middleware('permission:attendance.manage')->group(function () {
            Route::post('sessions/{session}/attendance', [ClassSessionController::class, 'markAttendance']);
            Route::post('attendance/board', [\App\Http\Controllers\Api\AttendanceBoardController::class, 'mark']);
            Route::post('absence-alerts/{alert}/acknowledge', [AbsenceAlertController::class, 'acknowledge']);
        });
        Route::middleware('permission:absence-alerts.manage')->group(function () {
            Route::apiResource('absence-alert-thresholds', AbsenceAlertThresholdController::class);
        });

        Route::middleware('permission:class-schedules.view')->group(function () {
            Route::get('class-schedules', [ClassScheduleController::class, 'index']);
            Route::get('class-schedules/{class_schedule}', [ClassScheduleController::class, 'show']);
        });
        Route::middleware('permission:class-schedules.manage')->group(function () {
            Route::post('class-schedules', [ClassScheduleController::class, 'store']);
            Route::put('class-schedules/{class_schedule}', [ClassScheduleController::class, 'update']);
            Route::patch('class-schedules/{class_schedule}', [ClassScheduleController::class, 'update']);
            Route::delete('class-schedules/{class_schedule}', [ClassScheduleController::class, 'destroy']);
        });

        Route::middleware('permission:guardians.view')->group(function () {
            Route::get('guardians', [GuardianController::class, 'index']);
            Route::get('guardians/{guardian}', [GuardianController::class, 'show']);
            Route::get('guardians/{guardian}/credit-balance', [GuardianCreditController::class, 'show']);
            Route::get('guardians/{guardian}/statement', [GuardianStatementController::class, 'show']);
        });
        Route::middleware('permission:guardians.manage')->group(function () {
            Route::post('guardians', [GuardianController::class, 'store']);
            Route::put('guardians/{guardian}', [GuardianController::class, 'update']);
            Route::patch('guardians/{guardian}', [GuardianController::class, 'update']);
            Route::delete('guardians/{guardian}', [GuardianController::class, 'destroy']);
        });

        Route::middleware('permission:students.view')->group(function () {
            Route::get('students', [StudentController::class, 'index']);
            Route::get('students/{student}', [StudentController::class, 'show']);
            Route::get('students/{student}/pdf', [StudentController::class, 'pdf']);
            Route::get('students/{student}/html', [StudentController::class, 'html']);
        });
        Route::middleware('permission:students.manage')->group(function () {
            Route::post('students', [StudentController::class, 'store']);
            Route::put('students/{student}', [StudentController::class, 'update']);
            Route::patch('students/{student}', [StudentController::class, 'update']);
            Route::delete('students/{student}', [StudentController::class, 'destroy']);
        });

        Route::middleware('permission:evaluations.view')->group(function () {
            Route::get('students/{student}/evaluations', [EvaluationController::class, 'index']);
        });
        Route::middleware('permission:evaluations.manage')->group(function () {
            Route::post('students/{student}/evaluations', [EvaluationController::class, 'store']);
            Route::put('evaluations/{evaluation}', [EvaluationController::class, 'update']);
            Route::patch('evaluations/{evaluation}', [EvaluationController::class, 'update']);
            Route::delete('evaluations/{evaluation}', [EvaluationController::class, 'destroy']);
        });

        Route::middleware('permission:materials.view')->group(function () {
            Route::get('educational-materials', [EducationalMaterialController::class, 'index']);
        });
        Route::middleware('permission:materials.manage')->group(function () {
            Route::post('educational-materials', [EducationalMaterialController::class, 'store']);
            Route::delete('educational-materials/{material}', [EducationalMaterialController::class, 'destroy']);
        });

        Route::middleware('permission:exams.view')->group(function () {
            Route::get('exams', [ExamController::class, 'index']);
            Route::get('exams/{exam}/results', [ExamController::class, 'results']);
        });
        Route::middleware('permission:exams.manage')->group(function () {
            Route::post('exams', [ExamController::class, 'store']);
            Route::post('exams/{exam}/results', [ExamController::class, 'storeResults']);
        });

        Route::middleware('permission:subscriptions.view')->group(function () {
            Route::get('students/{student}/subscriptions', [StudentSubscriptionController::class, 'index']);
            Route::get('subscriptions/{subscription}/changes', [SubscriptionChangeController::class, 'index']);
            Route::get('subscriptions/{subscription}/freezes', [SubscriptionFreezeController::class, 'index']);
        });
        Route::middleware('permission:subscriptions.manage')->group(function () {
            Route::post('students/{student}/subscribe', [StudentSubscriptionController::class, 'store']);
            Route::post('subscriptions/{subscription}/cancel', [SubscriptionCancelController::class, 'store']);
            Route::post('subscriptions/{subscription}/change-plan', [SubscriptionChangeController::class, 'changePlan']);
            Route::post('subscriptions/{subscription}/add-subject', [SubscriptionChangeController::class, 'addSubject']);
            Route::post('subscriptions/{subscription}/remove-subject', [SubscriptionChangeController::class, 'removeSubject']);
            Route::post('subscriptions/{subscription}/freeze', [SubscriptionFreezeController::class, 'store']);
            Route::post('subscription-freezes/{freeze}/end', [SubscriptionFreezeController::class, 'end']);
        });

        Route::middleware('permission:coupons.view')->group(function () {
            Route::get('coupons', [CouponController::class, 'index']);
            Route::get('coupons/{coupon}', [CouponController::class, 'show']);
            Route::post('coupons/validate', [CouponController::class, 'validateCode']);
        });
        Route::middleware('permission:coupons.manage')->group(function () {
            Route::post('coupons', [CouponController::class, 'store']);
            Route::put('coupons/{coupon}', [CouponController::class, 'update']);
            Route::patch('coupons/{coupon}', [CouponController::class, 'update']);
            Route::delete('coupons/{coupon}', [CouponController::class, 'destroy']);
        });

        Route::middleware('permission:marketing.view|marketing.manage')->group(function () {
            Route::get('marketing-sections', [MarketingSectionController::class, 'index']);
            Route::get('marketing-sections/{marketing_section}', [MarketingSectionController::class, 'show']);
        });
        Route::middleware('permission:marketing.manage')->group(function () {
            Route::post('marketing-sections', [MarketingSectionController::class, 'store']);
            Route::put('marketing-sections/{marketing_section}', [MarketingSectionController::class, 'update']);
            Route::patch('marketing-sections/{marketing_section}', [MarketingSectionController::class, 'update']);
            Route::delete('marketing-sections/{marketing_section}', [MarketingSectionController::class, 'destroy']);
            Route::post('marketing-sections/{marketing_section}/upload', [MarketingSectionController::class, 'upload']);
        });

        Route::get('settings/institute', [InstituteSettingController::class, 'show']);
        Route::match(['put', 'post'], 'settings/institute', [InstituteSettingController::class, 'update'])
            ->middleware('permission:settings.manage');

        Route::middleware('permission:invoices.view')->group(function () {
            Route::get('invoices', [InvoiceController::class, 'index']);
            Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
            Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
            Route::get('invoices/{invoice}/refunds', [InvoiceRefundController::class, 'index']);
            Route::post('invoices/{invoice}/pay', [MyFatoorahController::class, 'pay']);
            Route::get('invoice-installments/overdue', [InvoiceInstallmentController::class, 'overdueIndex']);
        });
        Route::middleware('permission:invoices.manage')->group(function () {
            Route::post('invoices/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);
            Route::post('invoices/{invoice}/refund', [InvoiceRefundController::class, 'store']);
            Route::post('invoices/{invoice}/installments/{installment}/mark-paid', [InvoiceInstallmentController::class, 'markPaid']);
        });

        Route::middleware('permission:installments.view')->group(function () {
            Route::get('installment-templates', [InstallmentTemplateController::class, 'index']);
            Route::get('installment-templates/{installment_template}', [InstallmentTemplateController::class, 'show']);
        });
        Route::middleware('permission:installments.manage')->group(function () {
            Route::post('installment-templates', [InstallmentTemplateController::class, 'store']);
            Route::put('installment-templates/{installment_template}', [InstallmentTemplateController::class, 'update']);
            Route::patch('installment-templates/{installment_template}', [InstallmentTemplateController::class, 'update']);
            Route::delete('installment-templates/{installment_template}', [InstallmentTemplateController::class, 'destroy']);
        });

        Route::middleware('permission:family-discounts.view')->group(function () {
            Route::get('family-discount-rules', [FamilyDiscountRuleController::class, 'index']);
            Route::get('family-discount-rules/{family_discount_rule}', [FamilyDiscountRuleController::class, 'show']);
        });
        Route::middleware('permission:family-discounts.manage')->group(function () {
            Route::post('family-discount-rules', [FamilyDiscountRuleController::class, 'store']);
            Route::put('family-discount-rules/{family_discount_rule}', [FamilyDiscountRuleController::class, 'update']);
            Route::patch('family-discount-rules/{family_discount_rule}', [FamilyDiscountRuleController::class, 'update']);
            Route::delete('family-discount-rules/{family_discount_rule}', [FamilyDiscountRuleController::class, 'destroy']);
        });

        Route::middleware('permission:enrollments.view')->group(function () {
            Route::get('enrollments', [EnrollmentController::class, 'index']);
            Route::get('enrollments/{enrollment}', [EnrollmentController::class, 'show']);
            Route::get('class-offerings/{class_offering}/waiting-list', [ClassOfferingWaitingListController::class, 'waitingList']);
        });
        Route::middleware('permission:enrollments.manage')->group(function () {
            Route::post('enrollments', [EnrollmentController::class, 'store']);
            Route::put('enrollments/{enrollment}', [EnrollmentController::class, 'update']);
            Route::patch('enrollments/{enrollment}', [EnrollmentController::class, 'update']);
            Route::patch('enrollments/{enrollment}/status', [EnrollmentController::class, 'updateStatus']);
            Route::put('students/{student}/enrollments/sync', [EnrollmentController::class, 'syncForStudent']);
            Route::delete('enrollments/{enrollment}', [EnrollmentController::class, 'destroy']);
            Route::post('class-offerings/{class_offering}/enroll-from-waiting-list', [ClassOfferingWaitingListController::class, 'enrollFromWaitingList']);
        });

        Route::middleware('permission:products.view')->group(function () {
            Route::get('products', [ProductController::class, 'index']);
            Route::get('products/{product}', [ProductController::class, 'show']);
        });
        Route::middleware('permission:products.manage')->group(function () {
            Route::post('products', [ProductController::class, 'store']);
            Route::put('products/{product}', [ProductController::class, 'update']);
            Route::patch('products/{product}', [ProductController::class, 'update']);
            Route::delete('products/{product}', [ProductController::class, 'destroy']);
        });

        Route::middleware('permission:delivery-zones.view')->group(function () {
            Route::get('delivery-zones', [DeliveryZoneController::class, 'index']);
            Route::get('delivery-zones/{delivery_zone}', [DeliveryZoneController::class, 'show']);
        });
        Route::middleware('permission:delivery-zones.manage')->group(function () {
            Route::post('delivery-zones', [DeliveryZoneController::class, 'store']);
            Route::put('delivery-zones/{delivery_zone}', [DeliveryZoneController::class, 'update']);
            Route::patch('delivery-zones/{delivery_zone}', [DeliveryZoneController::class, 'update']);
            Route::delete('delivery-zones/{delivery_zone}', [DeliveryZoneController::class, 'destroy']);
        });

        Route::middleware('permission:orders.view')->group(function () {
            Route::get('orders', [OrderController::class, 'index']);
            Route::get('orders/{order}', [OrderController::class, 'show']);
        });
        Route::middleware('permission:orders.manage')->group(function () {
            Route::post('students/{student}/orders', [OrderController::class, 'store']);
            Route::put('orders/{order}/status', [OrderController::class, 'updateStatus']);
            Route::patch('orders/{order}/status', [OrderController::class, 'updateStatus']);
        });

        Route::middleware('permission:private-lessons.view')->group(function () {
            Route::get('private-lesson-offers', [PrivateLessonOfferController::class, 'index']);
            Route::get('private-lesson-offers/{private_lesson_offer}', [PrivateLessonOfferController::class, 'show']);
            Route::get('private-lesson-offers/{private_lesson_offer}/slots', [PrivateLessonSlotController::class, 'index']);
            Route::get('private-lesson-offers/{private_lesson_offer}/slots/{slot}', [PrivateLessonSlotController::class, 'show']);
            Route::get('private-lesson-inquiries', [PrivateLessonInquiryController::class, 'index']);
            Route::get('private-lesson-inquiries/{private_lesson_inquiry}', [PrivateLessonInquiryController::class, 'show']);
        });
        Route::middleware('permission:private-lessons.manage')->group(function () {
            Route::post('private-lesson-offers', [PrivateLessonOfferController::class, 'store']);
            Route::put('private-lesson-offers/{private_lesson_offer}', [PrivateLessonOfferController::class, 'update']);
            Route::patch('private-lesson-offers/{private_lesson_offer}', [PrivateLessonOfferController::class, 'update']);
            Route::delete('private-lesson-offers/{private_lesson_offer}', [PrivateLessonOfferController::class, 'destroy']);
            Route::post('private-lesson-offers/{private_lesson_offer}/slots', [PrivateLessonSlotController::class, 'store']);
            Route::put('private-lesson-offers/{private_lesson_offer}/slots/{slot}', [PrivateLessonSlotController::class, 'update']);
            Route::patch('private-lesson-offers/{private_lesson_offer}/slots/{slot}', [PrivateLessonSlotController::class, 'update']);
            Route::delete('private-lesson-offers/{private_lesson_offer}/slots/{slot}', [PrivateLessonSlotController::class, 'destroy']);
            Route::get('private-lesson-bookings', [PrivateLessonBookingController::class, 'index']);
            Route::put('private-lesson-bookings/{booking}/confirm', [PrivateLessonBookingController::class, 'confirm']);
            Route::patch('private-lesson-bookings/{booking}/confirm', [PrivateLessonBookingController::class, 'confirm']);
            Route::put('private-lesson-inquiries/{private_lesson_inquiry}', [PrivateLessonInquiryController::class, 'update']);
            Route::patch('private-lesson-inquiries/{private_lesson_inquiry}', [PrivateLessonInquiryController::class, 'update']);
        });

        Route::middleware('permission:reports.view')->group(function () {
            Route::get('reports/revenue', [FinancialReportController::class, 'revenue']);
            Route::get('reports/revenue-by-payment-method', [FinancialReportController::class, 'revenueByPaymentMethod']);
            Route::get('reports/outstanding', [FinancialReportController::class, 'outstanding']);
        });
    });
});
