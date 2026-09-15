<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LegalPage extends Model
{
    public const KEY_PRIVACY = 'privacy';

    public const KEY_TERMS = 'terms';

    public const KEY_REFUND = 'refund-policy';

    /** @var list<string> */
    public const KEYS = [
        self::KEY_PRIVACY,
        self::KEY_TERMS,
        self::KEY_REFUND,
    ];

    protected $fillable = [
        'page_key',
        'title',
        'content',
    ];

    public static function findByKey(string $key): ?self
    {
        return static::query()->where('page_key', $key)->first();
    }
}
