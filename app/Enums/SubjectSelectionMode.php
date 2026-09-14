<?php

namespace App\Enums;

enum SubjectSelectionMode: string
{
    case AllSubjects = 'all_subjects';
    case SingleSubject = 'single_subject';
    case ChooseSubjects = 'choose_subjects';
    case None = 'none';
}
