<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

class CreateAdminCommand extends Command
{
    protected $signature = 'platform:create-admin
                            {--name= : اسم الأدمن}
                            {--email= : البريد الإلكتروني}
                            {--phone= : رقم الهاتف}
                            {--password= : كلمة المرور (يفضّل الإدخال التفاعلي المخفي)}';

    protected $description = 'Create the first platform admin account (seeds roles/permissions if missing)';

    public function handle(): int
    {
        $name = $this->resolveStringOption('name', 'الاسم');
        $email = $this->resolveStringOption('email', 'البريد الإلكتروني');
        $phone = $this->resolveStringOption('phone', 'رقم الهاتف');
        $password = $this->resolvePassword();

        $validator = Validator::make(
            [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => $password,
            ],
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'phone' => ['required', 'string', 'max:30'],
                'password' => ['required', 'string', 'min:8'],
            ],
            [
                'email.unique' => 'هذا البريد مستخدم بالفعل.',
                'password.min' => 'كلمة المرور يجب ألا تقل عن 8 أحرف.',
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $this->ensureRolesAndPermissions();

        $user = User::query()->create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => $password,
            'has_all_branch_access' => true,
        ]);

        $user->assignRole('admin');

        $this->info("تم إنشاء حساب الأدمن: {$user->email}");

        return self::SUCCESS;
    }

    private function resolveStringOption(string $option, string $question): string
    {
        $value = $this->option($option);

        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }

        return trim((string) $this->ask($question));
    }

    private function resolvePassword(): string
    {
        $value = $this->option('password');

        if (is_string($value) && $value !== '') {
            return $value;
        }

        return (string) $this->secret('كلمة المرور');
    }

    private function ensureRolesAndPermissions(): void
    {
        if (Role::query()->where('name', 'admin')->where('guard_name', 'web')->exists()) {
            return;
        }

        (new PermissionSeeder)->run();
        (new RoleSeeder)->run();
    }
}
