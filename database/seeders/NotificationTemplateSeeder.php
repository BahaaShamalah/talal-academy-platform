<?php

namespace Database\Seeders;

use App\Enums\NotificationChannel;
use App\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'event_key' => 'payment_received',
                'name_ar' => 'استلام دفعة',
                'body_template' => 'تم استلام دفعة بمبلغ {{amount}} د.ك للطالب {{student_name}} (فاتورة {{invoice_number}}).',
            ],
            [
                'event_key' => 'invoice_overdue',
                'name_ar' => 'قسط متأخر',
                'body_template' => 'تنبيه: قسط متأخر بمبلغ {{amount}} د.ك للطالب {{student_name}} يستحق بتاريخ {{due_date}} (مرجع: {{installment_id}}).',
            ],
            [
                'event_key' => 'invoice_issued',
                'name_ar' => 'إصدار فاتورة',
                'body_template' => 'صدرت فاتورة {{invoice_number}} بمبلغ {{amount}} د.ك للطالب {{student_name}}.',
            ],
            [
                'event_key' => 'attendance_absent',
                'name_ar' => 'تسجيل غياب',
                'body_template' => 'تم تسجيل غياب الطالب {{student_name}} بتاريخ {{session_date}}.',
            ],
            [
                'event_key' => 'exam_result_published',
                'name_ar' => 'نشر نتيجة اختبار',
                'body_template' => 'نُشرت نتيجة اختبار {{exam_title}} للطالب {{student_name}}: {{score}} من {{max_score}}.',
            ],
            [
                'event_key' => 'leave_request_submitted',
                'name_ar' => 'طلب إجازة جديد',
                'body_template' => 'طلب إجازة جديد من {{staff_name}} ({{leave_type}}) من {{start_date}} إلى {{end_date}}.',
            ],
            [
                'event_key' => 'leave_request_approved',
                'name_ar' => 'الموافقة على إجازة',
                'body_template' => 'تمت الموافقة على طلب إجازتك ({{leave_type}}) من {{start_date}} إلى {{end_date}}.',
            ],
            [
                'event_key' => 'leave_request_rejected',
                'name_ar' => 'رفض إجازة',
                'body_template' => 'تم رفض طلب إجازتك ({{leave_type}}) من {{start_date}} إلى {{end_date}}.',
            ],
            [
                'event_key' => 'contact_message_received',
                'name_ar' => 'رسالة تواصل من الموقع',
                'body_template' => 'رسالة جديدة من {{name}} — واتساب {{phone}} — {{stage}}: {{message}} (#{{contact_id}}).',
            ],
            [
                'event_key' => 'private_lesson_inquiry_requested',
                'name_ar' => 'طلب حصة خاصة من الموقع',
                'body_template' => 'طلب حصة خاصة جديد من الموقع: الطالب {{student_name}} — {{grade}} — {{subject}} — {{hours}} ساعة — {{phone}} (#{{inquiry_id}}).',
            ],
            [
                'event_key' => 'private_lesson_booking_requested',
                'name_ar' => 'طلب حصة خاصة',
                'body_template' => 'تم تسجيل طلب حصة خاصة للطالب {{student_name}} — المادة {{subject}} — المعلم {{teacher}} — الحالة {{status}} (حجز #{{booking_id}}).',
            ],
            [
                'event_key' => 'private_lesson_booking_confirmed',
                'name_ar' => 'تأكيد حصة خاصة',
                'body_template' => 'تم تأكيد موعد الحصة الخاصة للطالب {{student_name}} — {{subject}} مع {{teacher}} — الموعد: {{slot}} — يرجى إتمام الدفع (فاتورة #{{invoice_id}}).',
            ],
            [
                'event_key' => 'support_ticket_created',
                'name_ar' => 'تذكرة دعم جديدة',
                'body_template' => 'تذكرة دعم جديدة من {{guardian_name}}: {{subject}} (#{{ticket_id}}).',
            ],
            [
                'event_key' => 'support_ticket_staff_reply',
                'name_ar' => 'رد على تذكرة الدعم',
                'body_template' => 'وصلك رد جديد على تذكرة الدعم «{{subject}}» (#{{ticket_id}}).',
            ],
            [
                'event_key' => 'support_ticket_guardian_reply',
                'name_ar' => 'رد ولي الأمر على تذكرة',
                'body_template' => 'رد جديد من ولي الأمر على التذكرة «{{subject}}» (#{{ticket_id}}).',
            ],
            [
                'event_key' => 'support_ticket_closed',
                'name_ar' => 'إغلاق تذكرة دعم',
                'body_template' => 'تم إغلاق تذكرة الدعم «{{subject}}» (#{{ticket_id}}).',
            ],
            [
                'event_key' => 'enrollment_created',
                'name_ar' => 'تسجيل في مادة',
                'body_template' => 'تم تسجيل الطالب {{student_name}} في مادة {{subject}} ({{grade}}).',
            ],
            [
                'event_key' => 'waiting_list_enrolled',
                'name_ar' => 'تسكين من قائمة الانتظار',
                'body_template' => 'تم تسكين الطالب {{student_name}} في مادة {{subject}} من قائمة الانتظار.',
            ],
            [
                'event_key' => 'educational_material_published',
                'name_ar' => 'مادة تعليمية جديدة',
                'body_template' => 'نُشرت مادة تعليمية جديدة «{{title}}» للطالب {{student_name}}.',
            ],
            [
                'event_key' => 'evaluation_posted',
                'name_ar' => 'تقييم جديد',
                'body_template' => 'نُشر تقييم جديد للطالب {{student_name}} في مادة {{subject}}.',
            ],
            [
                'event_key' => 'subscription_activated',
                'name_ar' => 'تفعيل اشتراك',
                'body_template' => 'تم تفعيل اشتراك الطالب {{student_name}} في باقة {{plan_name}}.',
            ],
        ];

        foreach ($templates as $template) {
            NotificationTemplate::query()->updateOrCreate(
                [
                    'event_key' => $template['event_key'],
                    'channel' => NotificationChannel::InApp->value,
                ],
                [
                    'name_ar' => $template['name_ar'],
                    'subject' => null,
                    'body_template' => $template['body_template'],
                    'is_active' => true,
                ],
            );
        }
    }
}
