'use client';

import { use } from 'react';
import { ExamResultsPage } from '@/components/exams/exam-results-page';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExamResultsPage examId={id} />;
}
