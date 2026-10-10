'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Plus, RefreshCw, Trash2, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

type Row = { id: string; subjectId: string; topicId: string; subtopicId: string; count: number; difficulty: string };
type Question = {
    id: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string;
    correct_option: string; explanation?: string; difficulty?: string;
};

const newRow = (): Row => ({ id: crypto.randomUUID(), subjectId: '', topicId: '', subtopicId: '', count: 10, difficulty: 'all' });
const escapeLatex = (value: unknown) => String(value ?? '').replace(/([\\{}%$&#_^~])/g, '\\$1').replace(/\n/g, ' ');

export default function PaperGenerator() {
    const [catalog, setCatalog] = useState<{ subjects: any[]; topics: any[]; subtopics: any[] }>({ subjects: [], topics: [], subtopics: [] });
    const [rows, setRows] = useState<Row[]>([newRow()]);
    const [title, setTitle] = useState('Aptivo Practice Paper');
    const [review, setReview] = useState<{ row: Row; subject: any; questions: Question[] }[] | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        fetch('/api/mongo/mcqs?counts_only=true')
            .then(response => response.json())
            .then(data => setCatalog({ subjects: data.subjects || [], topics: data.topics || [], subtopics: data.subtopics || [] }))
            .catch(() => toast.error('Could not load the content hierarchy'));
    }, []);

    const updateRow = (id: string, changes: Partial<Row>) => setRows(current => current.map(row => row.id === id ? { ...row, ...changes, ...(changes.subjectId ? { topicId: '', subtopicId: '' } : {}), ...(changes.topicId ? { subtopicId: '' } : {}) } : row));
    const topicsFor = (subjectId: string) => catalog.topics.filter(topic => String(topic.subject_id) === subjectId);
    const subtopicsFor = (topicId: string) => catalog.subtopics.filter(subtopic => String(subtopic.topic_id) === topicId);

    const generate = async () => {
        const validRows = rows.filter(row => row.subjectId && row.count > 0);
        if (!validRows.length) return toast.error('Add at least one subject and question count');
        setBusy(true);
        try {
            const groups = await Promise.all(validRows.map(async row => {
                const params = new URLSearchParams({ limit: String(Math.max(row.count * 4, row.count)), shuffle: 'true' });
                if (row.subtopicId) params.set('subtopic_id', row.subtopicId);
                else if (row.topicId) { params.set('topic_id', row.topicId); params.set('include_children', 'true'); }
                else params.set('subject_id', row.subjectId);
                if (row.difficulty !== 'all') params.set('difficulty', row.difficulty);
                const response = await fetch(`/api/mongo/mcqs?${params}`);
                if (!response.ok) throw new Error('Question bank request failed');
                const data = await response.json();
                return { row, subject: catalog.subjects.find(subject => String(subject.id) === row.subjectId), questions: (data.mcqs || []).slice(0, row.count) };
            }));
            const missing = groups.find(group => group.questions.length < group.row.count);
            if (missing) return toast.error(`${missing.subject?.name || 'A subject'} has only ${missing.questions.length} matching questions`);
            setReview(groups);
        } catch (error: any) {
            toast.error(error.message || 'Could not generate the paper');
        } finally { setBusy(false); }
    };

    const downloadLatex = () => {
        if (!review) return;
        const optionText = (question: Question, option: string) => ({ A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }[option] || '');
        const body = review.map(group => `\\section*{\\centering ${escapeLatex(group.subject?.name)}}\n${group.questions.map((question, index) => `\\noindent\\textbf{${index + 1}.} ${escapeLatex(question.question)}\\par\n\\begin{tabular}{@{}p{0.46\\textwidth}@{\\hspace{0.06\\textwidth}}p{0.46\\textwidth}@{}}\n\\textbf{A.} ${escapeLatex(question.option_a)} & \\textbf{B.} ${escapeLatex(question.option_b)}\\\\[6pt]\n\\textbf{C.} ${escapeLatex(question.option_c)} & \\textbf{D.} ${escapeLatex(question.option_d)}\n\\end{tabular}\\par\\medskip`).join('\n\n')}`).join('\n\\newpage\n');
        const answers = review.map(group => `\\section*{\\centering ${escapeLatex(group.subject?.name)} Answer Key}\n\\begin{enumerate}[label=\\arabic*., leftmargin=*]\n${group.questions.map(question => `\\item (${escapeLatex(question.correct_option)}) ${escapeLatex(optionText(question, question.correct_option))}`).join('\n')}\n\\end{enumerate}`).join('\n\\newpage\n');
        const latex = `\\documentclass[12pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{enumitem}\n\\usepackage{array}\n\\begin{document}\n\\begin{center}\\LARGE\\textbf{${escapeLatex(title)}}\\end{center}\n\\bigskip\n${body}\n\\newpage\n\\section*{\\centering Answer Key}\n${answers}\n\\end{document}\n`;
        const url = URL.createObjectURL(new Blob([latex], { type: 'application/x-tex' }));
        const link = document.createElement('a'); link.href = url; link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'aptivo-paper'}.tex`; link.click(); URL.revokeObjectURL(url);
    };

    const answerText = (question: Question) => ({ A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d }[question.correct_option] || '');

    return <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Assessment Studio</p><h1 className="text-3xl font-black text-slate-900 mt-2">Paper Generation</h1><p className="text-slate-500 mt-1">Build a subject-wise MCQ paper, review it, then download LaTeX.</p></div>
            <FileText className="w-12 h-12 text-teal-600" />
        </div>
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
            <div><label className="text-sm font-bold text-slate-700">Paper title</label><input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" /></div>
            <div className="space-y-3">{rows.map((row, index) => <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-t border-slate-100 pt-4">
                <label className="md:col-span-3 text-sm font-bold text-slate-700">Subject<select value={row.subjectId} onChange={event => updateRow(row.id, { subjectId: event.target.value })} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 font-normal"><option value="">Select subject</option>{catalog.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                <label className="md:col-span-3 text-sm font-bold text-slate-700">Topic<select value={row.topicId} onChange={event => updateRow(row.id, { topicId: event.target.value })} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 font-normal"><option value="">All topics</option>{topicsFor(row.subjectId).map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>
                <label className="md:col-span-2 text-sm font-bold text-slate-700">Subtopic<select value={row.subtopicId} onChange={event => updateRow(row.id, { subtopicId: event.target.value })} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 font-normal"><option value="">All subtopics</option>{subtopicsFor(row.topicId).map(subtopic => <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>)}</select></label>
                <label className="md:col-span-2 text-sm font-bold text-slate-700">Difficulty<select value={row.difficulty} onChange={event => updateRow(row.id, { difficulty: event.target.value })} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 font-normal"><option value="all">Any level</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
                <label className="md:col-span-1 text-sm font-bold text-slate-700">MCQs<input type="number" min="1" max="200" value={row.count} onChange={event => updateRow(row.id, { count: Number(event.target.value) })} className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-3 font-normal" /></label>
                <button title="Remove subject" disabled={rows.length === 1} onClick={() => setRows(current => current.filter(item => item.id !== row.id))} className="md:col-span-1 p-3 text-slate-400 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-5 h-5 mx-auto" /></button>
            </div>)}</div>
            <div className="flex flex-wrap gap-3"><button onClick={() => setRows(current => [...current, newRow()])} className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 hover:border-teal-500"><Plus className="w-4 h-4" />Add subject</button><button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-teal-600 text-white font-bold hover:bg-teal-700 disabled:opacity-60">{busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <WandSparkles className="w-4 h-4" />}Generate & review</button></div>
        </section>
        {review && <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3 items-center"><div><h2 className="text-xl font-black text-slate-900">Review paper</h2><p className="text-sm text-slate-500">{review.reduce((total, group) => total + group.questions.length, 0)} questions, grouped by subject. The answer key is shown at the end.</p></div><button onClick={downloadLatex} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 font-bold hover:bg-slate-700"><Download className="w-4 h-4" />Download .tex</button></div><div className="mt-5 space-y-8">{review.map(group => <div key={group.row.id}><h3 className="text-center text-xl font-black text-teal-700 border-b border-teal-100 pb-3">{group.subject?.name} <span className="text-sm font-normal text-slate-500">({group.questions.length} MCQs)</span></h3><ol className="mt-5 space-y-6">{group.questions.map((question, index) => <li key={question.id} className="border-b border-slate-100 pb-5"><div className="flex gap-2 text-slate-800 font-medium"><span className="font-bold shrink-0">{index + 1}.</span><MarkdownRenderer content={question.question} className="[&_p]:m-0" /></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-3 ml-6 text-slate-700"><div className="flex gap-2"><b>A.</b><MarkdownRenderer content={question.option_a} className="[&_p]:m-0" /></div><div className="flex gap-2"><b>B.</b><MarkdownRenderer content={question.option_b} className="[&_p]:m-0" /></div><div className="flex gap-2"><b>C.</b><MarkdownRenderer content={question.option_c} className="[&_p]:m-0" /></div><div className="flex gap-2"><b>D.</b><MarkdownRenderer content={question.option_d} className="[&_p]:m-0" /></div></div></li>)}</ol></div>)}<div className="border-t-4 border-slate-900 pt-8 mt-12"><h2 className="text-center text-2xl font-black text-slate-900">Answer Key</h2><div className="mt-6 space-y-6">{review.map(group => <div key={`key-${group.row.id}`}><h3 className="text-center text-lg font-black text-teal-700 border-b border-teal-100 pb-2">{group.subject?.name}</h3><ol className="mt-3 space-y-2 list-decimal list-inside text-slate-700">{group.questions.map(question => <li key={`answer-${question.id}`}><span className="font-bold">({question.correct_option})</span> <MarkdownRenderer content={answerText(question)} className="inline [&_p]:inline [&_p]:m-0" /></li>)}</ol></div>)}</div></div></div></section>}
    </div>;
}