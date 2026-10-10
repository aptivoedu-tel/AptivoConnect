'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToExcelUploader() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/excel-uploader');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Redirecting to Universal Excel Resolver...</p>
            </div>
        </div>
    );
}
