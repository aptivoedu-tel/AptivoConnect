'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, Upload, Folder, BookOpen, Layers, CheckCircle, AlertTriangle, Save, X, AlertCircle, Info, Filter, Search, ArrowRight, ShieldCheck, Database, FileWarning, SearchCode, RefreshCw, Pencil } from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';
import { toast } from 'sonner';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
// Supabase removed — using MongoDB API via fetch
// import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { ExcelUploadService, MCQRow } from '@/lib/services/excelUploadService';

export default function ExcelUploaderPage() {
    const [user, setUser] = useState<any>(null);

    // Hierarchy Data
    const [subjectsList, setSubjectsList] = useState<any[]>([]);
    const [topicsList, setTopicsList] = useState<any[]>([]);
    const [subtopicsList, setSubtopicsList] = useState<any[]>([]);
    const [universitiesList, setUniversitiesList] = useState<any[]>([]);
    const [testSectionsList, setTestSectionsList] = useState<any[]>([]);
    const [allHierarchy, setAllHierarchy] = useState<{ subjects: any[], topics: any[], subtopics: any[], universities: any[], testSections: any[] }>({
        subjects: [],
        topics: [],
        subtopics: [],
        universities: [],
        testSections: []
    });

    // UI Configuration
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');
    const [globalTestSection, setGlobalTestSection] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'unidentified' | 'duplicates'>('all');

    // Upload & Analysis State
    const [dragActive, setDragActive] = useState(false);
    const [dragActiveStandard, setDragActiveStandard] = useState(false);
    const [dragActivePassage, setDragActivePassage] = useState(false);
    const [isPassageMode, setIsPassageMode] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [autoDetectMode, setAutoDetectMode] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Hierarchy Resolver State
    const [unresolvedMappings, setUnresolvedMappings] = useState<{
        subjects: { [key: string]: number | null };
        topics: { [key: string]: number | null };
        subtopics: { [key: string]: number | null };
        entityMappings: { [key: string]: { type: 'uni' | 'ts', id: number | null } | null };
    }>({ subjects: {}, topics: {}, subtopics: {}, entityMappings: {} });

    // Track which indexes were unidentified during the last scan
    const [unidentifiedIndices, setUnidentifiedIndices] = useState<Set<number>>(new Set());

    // Per-row Overrides for manual resolution
    const [manualResolutions, setManualResolutions] = useState<Record<number, {
        subjId?: number;
        topicId?: number;
        subtopicId?: number;
        uniId?: number;
        tsId?: number;
    }>>({});

    const [duplicateAnalysis, setDuplicateAnalysis] = useState<any>(null);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
    const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());
    const [isCommitting, setIsCommitting] = useState(false);
    
    // Quick Edit State
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<any>(null);

    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        if (currentUser) setUser(currentUser);
        else if (storedUser) setUser(JSON.parse(storedUser));

        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const res = await fetch('/api/mongo/admin/hierarchy?type=all');
            if (res.ok) {
                const data = await res.json();
                setSubjectsList(data.subjects || []);

                // Fetch universities and test sections in parallel
                const [uniRes, tsRes] = await Promise.all([
                    fetch('/api/mongo/universities?include_counts=true'),
                    fetch('/api/mongo/test-sections?include_counts=true')
                ]);
                const uniData = uniRes.ok ? await uniRes.json() : { universities: [] };
                const tsData = tsRes.ok ? await tsRes.json() : { sections: [] };

                setUniversitiesList(uniData.universities || []);
                setTestSectionsList(tsData.sections || []);
                
                // For independent exams, we might need all subjects regardless of test_section_id
                // to allow mapping. But for now, we'll fetch all.
                const allSubRes = await fetch('/api/mongo/content?type=subjects&test_section_id=all').catch(() => ({ json: () => ({ subjects: [] }) }));
                const allSubData = await (allSubRes as any).json();

                setAllHierarchy({
                    subjects: allSubData.subjects || data.subjects || [],
                    topics: data.topics || [],
                    subtopics: data.subtopics || [],
                    universities: uniData.universities || [],
                    testSections: tsData.sections || []
                });
            }
        } catch (error) {
            console.error('Error loading initial hierarchy:', error);
        }
    };

    const loadMissingHierarchy = async () => {
        // Already loaded in loadInitialData, but keeping for compatibility
        await loadInitialData();
    };

    // Manual Form Selectors logic
    useEffect(() => {
        if (subject) {
            const filtered = allHierarchy.topics.filter(t => t.subject_id === parseInt(subject));
            setTopicsList(filtered);
        } else {
            setTopicsList([]);
        }
        setTopic('');
    }, [subject, allHierarchy.topics]);

    // Filter subjects based on test section if independent
    const filteredSubjectsList = useMemo(() => {
        if (!globalTestSection) return subjectsList.filter(s => !s.test_section_id || s.test_section_id === 0);
        const section = testSectionsList.find(ts => ts.id === parseInt(globalTestSection));
        if (section?.is_independent) {
            return subjectsList.filter(s => s.test_section_id === section.id);
        }
        return subjectsList.filter(s => !s.test_section_id || s.test_section_id === 0);
    }, [globalTestSection, subjectsList, testSectionsList]);

    useEffect(() => {
        if (topic) {
            const filtered = allHierarchy.subtopics.filter(st => st.topic_id === parseInt(topic));
            setSubtopicsList(filtered);
        } else {
            setSubtopicsList([]);
        }
        setSubtopic('');
    }, [topic, allHierarchy.subtopics]);

    const handleDragStandard = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActiveStandard(true);
        else if (e.type === "dragleave") setDragActiveStandard(false);
    };

    const handleDropStandard = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActiveStandard(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setIsPassageMode(false);
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragPassage = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActivePassage(true);
        else if (e.type === "dragleave") setDragActivePassage(false);
    };

    const handleDropPassage = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActivePassage(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setIsPassageMode(true);
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsPassageMode(false);
            processFile(e.target.files[0]);
        }
    };

    const handlePassageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsPassageMode(true);
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        setSelectedFile(file);
        setGlobalLoading(true, 'Analyzing Academic Data Structure...');

        try {
            const { data, errors } = await ExcelUploadService.parseExcelFile(file);
            
            if (data.length === 0) {
                const errorMsg = errors.length > 0 
                    ? `Template Error: ${errors[0].message}` 
                    : 'Error parsing Excel file. Please ensure it contains question data and follows the template.';
                alert(errorMsg);
                setSelectedFile(null);
                setGlobalLoading(false);
                return;
            }

            setPreviewData(data);

            // ALWAYS Run Pre-validation Duplicate Scan regardless of mode
            const dupResult = await ExcelUploadService.validateDuplicates(data as any);
            setDuplicateAnalysis(dupResult);

            if (autoDetectMode) {
                await runSmartScan(data, dupResult);
            } else {
                // In manual mode, we still need to identify unidentified indices (all of them basically)
                const unID = new Set<number>();
                data.forEach((_, idx) => unID.add(idx));
                setUnidentifiedIndices(unID);
                
                // Initialize selection (select all except duplicates)
                const initialSelection = new Set<number>();
                data.forEach((_, idx) => {
                    const isDuplicate = dupResult?.items?.some((i: any) => i.index === idx);
                    if (!isDuplicate) initialSelection.add(idx);
                });
                setSelectedRows(initialSelection);
            }
        } catch (err: any) {
            console.error('File Processing Error:', err);
            alert('An unexpected error occurred while processing the file. Please try again.');
            setSelectedFile(null);
        } finally {
            setGlobalLoading(false);
        }
    };

    const runSmartScan = async (mcqRows: MCQRow[], dupResult: any) => {
        setIsAnalyzing(true);
        await loadMissingHierarchy();

        // Map to DB IDs using composite keys for accurate nesting hierarchy
        const newMap: any = { subjects: {}, topics: {}, subtopics: {}, entityMappings: {} };

        mcqRows.forEach(row => {
            const s = row.subject;
            const t = row.topic;
            const st = row.subtopic;
            const u = row.university;
            const ts = row.test_section;

            if (u && newMap.entityMappings[u] === undefined) {
                const matchU = allHierarchy.universities.find(db =>
                    db.name.toLowerCase().trim() === u.toLowerCase() ||
                    db.slug?.toLowerCase() === u.toLowerCase()
                );
                if (matchU) newMap.entityMappings[u] = { type: 'uni', id: matchU.id };
                else newMap.entityMappings[u] = null;
            }

            if (ts && newMap.entityMappings[ts] === undefined) {
                const matchTS = allHierarchy.testSections.find(db =>
                    db.name.toLowerCase().trim() === ts.toLowerCase()
                );
                if (matchTS) newMap.entityMappings[ts] = { type: 'ts', id: matchTS.id };
                else if (newMap.entityMappings[ts] === undefined) newMap.entityMappings[ts] = null;
            }

            // Subject lookup
            let matchedSubjectId: number | null = null;
            if (s) {
                if (newMap.subjects[s] === undefined) {
                    const matchS = allHierarchy.subjects.find(db => db.name.toLowerCase().trim() === s.toLowerCase());
                    newMap.subjects[s] = matchS ? matchS.id : null;
                }
                matchedSubjectId = newMap.subjects[s];
            }

            // Topic lookup (Composite Key)
            let matchedTopicId: number | null = null;
            if (t) {
                const topicKey = s ? `${s}|${t}` : t;
                if (newMap.topics[topicKey] === undefined) {
                    if (s && !matchedSubjectId) {
                        newMap.topics[topicKey] = null;
                    } else {
                        const matchT = allHierarchy.topics.find(db =>
                            db.name.toLowerCase().trim() === t.toLowerCase() &&
                            (!matchedSubjectId || db.subject_id === matchedSubjectId)
                        );
                        newMap.topics[topicKey] = matchT ? matchT.id : null;
                    }
                }
                matchedTopicId = newMap.topics[topicKey];
            }

            // Subtopic lookup (Composite Key)
            if (st) {
                const subtopicKey = t ? `${t}|${st}` : st;
                if (newMap.subtopics[subtopicKey] === undefined) {
                    if (t && !matchedTopicId) {
                        newMap.subtopics[subtopicKey] = null;
                    } else {
                        const matchST = allHierarchy.subtopics.find(db =>
                            db.name.toLowerCase().trim() === st.toLowerCase() &&
                            (!matchedTopicId || db.topic_id === matchedTopicId)
                        );
                        newMap.subtopics[subtopicKey] = matchST ? matchST.id : null;
                    }
                }
            }
        });

        setUnresolvedMappings(newMap);

        // Prepare rows for UI display and status calculation
        const rowsForValidation = mcqRows.map(row => {
            const topicKey = row.subject ? `${row.subject}|${row.topic}` : row.topic;
            const subtopicKey = row.topic ? `${row.topic}|${row.subtopic}` : row.subtopic;
            
            const uniRes = row.university ? newMap.entityMappings[row.university] : null;
            const tsRes = row.test_section ? newMap.entityMappings[row.test_section] : null;

            return {
                ...row,
                subjectId: row.subject ? newMap.subjects[row.subject as string] : null,
                topicId: (row.topic && topicKey) ? newMap.topics[topicKey as string] : null,
                subtopicId: (row.subtopic && subtopicKey) ? newMap.subtopics[subtopicKey as string] : null,
                universityId: uniRes?.type === 'uni' ? uniRes.id : null,
                testSectionId: tsRes?.type === 'ts' ? tsRes.id : null
            };
        });

        // Identify which items need resolution
        const unID = new Set<number>();
        rowsForValidation.forEach((row, idx) => {
            const topicHasSubtopics = row.topicId ? allHierarchy.subtopics.some(st => st.topic_id === row.topicId) : false;
            const subtopicValid = !topicHasSubtopics || row.subtopicId !== null;
            
            // Unresolved if university exists but has no ID, OR if test_section exists but has no ID
            const universityUnresolved = row.university && !row.universityId;
            const tsUnresolved = row.test_section && !row.testSectionId;

            if (!row.subjectId || !row.topicId || !subtopicValid || universityUnresolved || tsUnresolved) unID.add(idx);
        });
        setUnidentifiedIndices(unID);
        
        // Initialize selection (select all except duplicates)
        const initialSelection = new Set<number>();
        rowsForValidation.forEach((row, idx) => {
            const isDuplicate = dupResult?.items?.some((i: any) => i.index === idx);
            if (!isDuplicate) initialSelection.add(idx);
        });
        setSelectedRows(initialSelection);

        setIsAnalyzing(false);
    };

    const getRowValue = (row: any, patterns: string[]) => {
        const rowKeys = Object.keys(row).filter(k => k !== 'undefined' && k !== 'null');

        // First pass: Exact match (case-insensitive, trimmed)
        let key = rowKeys.find(k => {
            const kl = k.toLowerCase().trim();
            return patterns.some(p => kl === p.toLowerCase().trim());
        });

        if (!key) {
            // Second pass: Word boundary match
            // This allows matching "Option B" for pattern "b" 
            // but prevents matching "Subtopic" for pattern "b".
            key = rowKeys.find(k => {
                const kl = k.toLowerCase().trim();
                return patterns.some(p => {
                    const pl = p.toLowerCase().trim();
                    if (!pl) return false;

                    // Use regex with word boundaries
                    // Escaping pl for safety (though here it's usually alpha chars)
                    const escapedP = pl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?:^|\\b|_)${escapedP}(?:$|\\b|_)`, 'i');
                    return regex.test(kl);
                });
            });
        }
        return key ? row[key] : null;
    };

    // Computational derived data for table
    const processedTableData = useMemo(() => {
        return previewData
            .map((row: any, idx: number) => {
                const excelSubj = getRowValue(row, ['subject'])?.toString().trim() || '';
                const excelTopic = getRowValue(row, ['topic'])?.toString().trim() || '';
                const excelSubtopic = getRowValue(row, ['subtopic'])?.toString().trim() || '';
                const excelUni = getRowValue(row, ['university', 'uni'])?.toString().trim() || '';
                const excelTs = getRowValue(row, ['test_section', 'test', 'section', 'test_election', 'test_selection', 'test section'])?.toString().trim() || '';

                const override = manualResolutions[idx] || {};
                const resolvedSubjId = ('subjId' in override) ? override.subjId : (excelSubj ? unresolvedMappings.subjects[excelSubj] : null);
                const resolvedTopicId = ('topicId' in override) ? override.topicId : (excelTopic ? unresolvedMappings.topics[excelSubj ? `${excelSubj}|${excelTopic}` : excelTopic] : null);
                const resolvedSubtopicId = ('subtopicId' in override) ? override.subtopicId : (excelSubtopic ? unresolvedMappings.subtopics[excelTopic ? `${excelTopic}|${excelSubtopic}` : excelSubtopic] : null);
                
                // Entity Resolution (Uni or TS) - Unified
                const effectiveLabel = excelUni || excelTs;
                const entityRes = ('uniId' in override || 'tsId' in override) 
                    ? { type: ('uniId' in override ? 'uni' : 'ts'), id: (override.uniId ?? override.tsId ?? null) }
                    : (effectiveLabel ? unresolvedMappings.entityMappings[effectiveLabel] : null);

                const resolvedUniId = entityRes?.type === 'uni' ? entityRes.id : null;
                const resolvedTsId = entityRes?.type === 'ts' ? entityRes.id : (!autoDetectMode && globalTestSection ? parseInt(globalTestSection) : null);

                const topicHasSubtopics = resolvedTopicId ? allHierarchy.subtopics.some(st => st.topic_id === resolvedTopicId) : false;
                const subtopicValid = !topicHasSubtopics || resolvedSubtopicId !== null;

                const validation = ExcelUploadService.validateMCQRow(row);
                const hierarchyValid = !autoDetectMode || (resolvedSubjId !== null && resolvedTopicId !== null && subtopicValid);

                // Check duplicate status
                const dupInfo = duplicateAnalysis?.items?.find((item: any) => item.index === idx);

                return {
                    original: row,
                    index: idx,
                    excelSubj,
                    excelTopic,
                    excelSubtopic,
                    excelUni,
                    excelTs,
                    resolvedSubjId,
                    resolvedTopicId,
                    resolvedSubtopicId,
                    resolvedUniId,
                    resolvedTsId,
                    isValid: validation.isValid && hierarchyValid && !dupInfo,
                    hierarchyValid,
                    isOriginallyUnidentified: unidentifiedIndices.has(idx),
                    validationErrors: validation.errors,
                    dupInfo
                };
            })
            .filter(d => !rejectedIndices.has(d.index));
    }, [previewData, unresolvedMappings, manualResolutions, autoDetectMode, duplicateAnalysis, unidentifiedIndices, rejectedIndices]);

    const filteredData = useMemo(() => {
        if (activeTab === 'unidentified') return processedTableData.filter(d => !d.hierarchyValid);
        if (activeTab === 'duplicates') return processedTableData.filter(d => !!d.dupInfo);
        return processedTableData;
    }, [processedTableData, activeTab]);

    const stats = useMemo(() => {
        const unid = processedTableData.filter((d: any) => !d.hierarchyValid).length;
        const dups = processedTableData.filter((d: any) => !!d.dupInfo).length;
        return { total: processedTableData.length, unidentified: unid, duplicates: dups };
    }, [processedTableData]);

    const updateManualResolution = (idx: number, field: 'subjId' | 'topicId' | 'subtopicId' | 'uniId' | 'tsId', val: number | null) => {
        setManualResolutions(prev => ({
            ...prev,
            [idx]: { ...prev[idx], [field]: val }
        }));
    };

    const bulkApplyResolution = (excelLabel: string, type: 'subject' | 'topic' | 'subtopic' | 'entity', data: any) => {
        setUnresolvedMappings(prev => {
            if (type === 'entity') {
                return {
                    ...prev,
                    entityMappings: { ...prev.entityMappings, [excelLabel]: data }
                };
            }
            const field = type === 'subject' ? 'subjects' : type === 'topic' ? 'topics' : 'subtopics';
            return {
                ...prev,
                [field]: { ...prev[field], [excelLabel]: data }
            };
        });

        // Clear manual overrides if they match this label
        const updated = { ...manualResolutions };
        processedTableData.forEach(d => {
            const currentLabel = (type === 'entity') ? (d.excelUni || d.excelTs) : (type === 'subject' ? d.excelSubj : type === 'topic' ? d.excelTopic : d.excelSubtopic);
            if (currentLabel === excelLabel && updated[d.index]) {
                if (type === 'entity') {
                    delete updated[d.index].uniId;
                    delete updated[d.index].tsId;
                } else {
                    delete updated[d.index][type === 'subject' ? 'subjId' : type === 'topic' ? 'topicId' : 'subtopicId'];
                }
            }
        });
        setManualResolutions(updated);
    };

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredData.length) {
            setSelectedRows(new Set());
        } else {
            const newSelection = new Set(selectedRows);
            filteredData.forEach(d => newSelection.add(d.index));
            setSelectedRows(newSelection);
        }
    };

    const toggleRowSelection = (idx: number) => {
        const next = new Set(selectedRows);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedRows(next);
    };

    const rejectAllDuplicates = () => {
        const toReject = processedTableData.filter(d => !!d.dupInfo).map(d => d.index);
        const nextRejected = new Set(rejectedIndices);
        toReject.forEach(idx => nextRejected.add(idx));

        const nextSelected = new Set(selectedRows);
        toReject.forEach(idx => nextSelected.delete(idx));

        setRejectedIndices(nextRejected);
        setSelectedRows(nextSelected);
        setActiveTab('all');
        alert(`${toReject.length} duplicates have been filtered out from the active queue.`);
    };

    const handleSaveToDatabase = async () => {
        if (!user) return toast.error('Session expired.');
        if (loading || isCommitting) return;
        if (selectedRows.size === 0) return toast.error('No questions selected for upload.');

        if (stats.unidentified > 0 && autoDetectMode) {
            const hasUnidentifiedInSelection = processedTableData.some(d => selectedRows.has(d.index) && !d.hierarchyValid);
            if (hasUnidentifiedInSelection) {
                setActiveTab('unidentified');
                return alert(`Please resolve or de-select the unidentified items before committing.`);
            }
        }

        const mcqsToUpload = processedTableData
            .filter(d => selectedRows.has(d.index))
            .map(d => {
                const row = d.original;
                return {
                    subject: d.excelSubj,
                    topic: d.excelTopic,
                    subtopic: d.excelSubtopic,
                    question: getRowValue(row, ['question', 'text']) || '',
                    option_a: getRowValue(row, ['option a', 'a']) || '',
                    option_b: getRowValue(row, ['option b', 'b']) || '',
                    option_c: getRowValue(row, ['option c', 'c']) || '',
                    option_d: getRowValue(row, ['option d', 'd']) || '',
                    correct_option: (getRowValue(row, ['correct', 'answer']) || 'A').toString().toUpperCase() as any,
                    explanation: getRowValue(row, ['explanation']),
                    difficulty: (getRowValue(row, ['difficulty']) || 'medium').toString().toLowerCase() as any,
                    subjectId: autoDetectMode ? d.resolvedSubjId : parseInt(subject),
                    topicId: autoDetectMode ? d.resolvedTopicId : parseInt(topic),
                    subtopicId: autoDetectMode ? d.resolvedSubtopicId : parseInt(subtopic),
                    universityId: d.resolvedUniId || null,
                    testSectionId: d.resolvedTsId || null,
                    passage_title: row.passage_title || getRowValue(row, ['passage_title', 'passageheader', 'passagetitle']),
                    passage_content: row.passage_content || getRowValue(row, ['passage_content', 'passagetext', 'passagecontent', 'passage']),
                    passage_id_key: row.passage_id_key || getRowValue(row, ['passage_id_key', 'passageidkey', 'passageid', 'passagegroup', 'passagekey'])
                };
            });

        if (mcqsToUpload.length === 0) return alert('No valid questions to upload after duplicate filtering.');

        setIsCommitting(true);
        setGlobalLoading(true, 'Committing Verified Data...');
        try {
            const result = await ExcelUploadService.uploadMCQsWithAutoDetect(mcqsToUpload as any, user.id, selectedFile?.name || 'bulk_upload.xlsx');
            if (result.success) {
                toast.success(`Successfully uploaded ${result.processedRows} questions!`);
                resetUpload();
            }
        } catch (err: any) {
            toast.error('Upload failed: ' + err.message);
        } finally {
            setGlobalLoading(false);
            setIsCommitting(false);
        }
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreviewData([]);
        setManualResolutions({});
        setDuplicateAnalysis(null);
        setRejectedIndices(new Set());
        setSelectedRows(new Set());
        setUnresolvedMappings({ subjects: {}, topics: {}, subtopics: {}, entityMappings: {} });
        setIsPassageMode(false);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Subject': 'Computer Science',
                'Topic': 'Cloud Computing',
                'Subtopic': 'AWS Infrastructure',
                'Question': 'Which service provides virtual servers in the cloud?',
                'Option A': 'S3',
                'Option B': 'EC2',
                'Option C': 'Lambda',
                'Option D': 'RDS',
                'Correct Option': 'B',
                'Explanation': 'EC2 stands for Elastic Compute Cloud.',
                'Difficulty': 'Easy',
                'University': 'FAST University'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "aptivo_mcq_template.xlsx");
    };

    const handleDownloadPassageTemplate = () => {
        const templateData = [
            {
                'Subject': 'English',
                'Topic': 'Reading Comprehension',
                'Subtopic': 'Inference Questions',
                'Passage Group Key': 'Passage A',
                'Passage Title': 'The Solar System',
                'Passage Content': 'The Solar System consists of the Sun and the planets orbiting it...',
                'Question': 'What is at the center of the Solar System?',
                'Option A': 'The Sun',
                'Option B': 'The Earth',
                'Option C': 'Mars',
                'Option D': 'Jupiter',
                'Correct Option': 'A',
                'Explanation': 'The Sun is at the center of the Solar System.',
                'Difficulty': 'Easy',
                'University': 'NUST University'
            },
            {
                'Subject': 'English',
                'Topic': 'Reading Comprehension',
                'Subtopic': 'Inference Questions',
                'Passage Group Key': 'Passage A',
                'Passage Title': '',
                'Passage Content': '',
                'Question': 'Which planet is second from the Sun?',
                'Option A': 'Mercury',
                'Option B': 'Venus',
                'Option C': 'Earth',
                'Option D': 'Mars',
                'Correct Option': 'B',
                'Explanation': 'Venus is the second planet from the Sun.',
                'Difficulty': 'Medium',
                'University': 'NUST University'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Passage Template");
        XLSX.writeFile(wb, "aptivo_passage_template.xlsx");
    };

    const startEditing = (idx: number, row: any) => {
        setEditingIndex(idx);
        setEditFormData({
            question: getRowValue(row, ['question', 'text']) || '',
            option_a: getRowValue(row, ['option a', 'a']) || '',
            option_b: getRowValue(row, ['option b', 'b']) || '',
            option_c: getRowValue(row, ['option c', 'c']) || '',
            option_d: getRowValue(row, ['option d', 'd']) || '',
            correct_option: (getRowValue(row, ['correct', 'answer']) || 'A').toString().toUpperCase(),
            explanation: getRowValue(row, ['explanation', 'reason']) || ''
        });
    };

    const saveEdit = () => {
        if (editingIndex === null || !editFormData) return;
        const newData = [...previewData];
        const row = { ...newData[editingIndex] };
        
        const updateKey = (patterns: string[], val: string) => {
             const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().trim() === p.toLowerCase().trim()));
             if (key) row[key] = val;
             else row[patterns[0]] = val;
        };

        updateKey(['question', 'text'], editFormData.question);
        updateKey(['option a', 'a'], editFormData.option_a);
        updateKey(['option b', 'b'], editFormData.option_b);
        updateKey(['option c', 'c'], editFormData.option_c);
        updateKey(['option d', 'd'], editFormData.option_d);
        updateKey(['correct', 'solution', 'answer'], editFormData.correct_option);
        updateKey(['explanation', 'reason'], editFormData.explanation);

        newData[editingIndex] = row;
        setPreviewData(newData);
        setEditingIndex(null);
        setEditFormData(null);
        toast.success('Question updated in preview');
    };


    return (
        <div className="min-h-screen bg-[#F9FAFB] flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-6 sm:px-10">
                    <div className="max-w-[1600px] mx-auto">

                        {/* Interactive Status Dashboard */}
                        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-10">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    Content Ingestion <span className="text-indigo-600">Resolver</span>
                                </h1>
                                <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-[10px]">Library Integrity Pipeline & Auditor</p>
                            </div>

                            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
                                {[
                                    { id: 'all', label: 'All Items', count: stats.total, color: 'bg-slate-900' },
                                    { id: 'unidentified', label: 'Unidentified', count: stats.unidentified, color: 'bg-amber-500' },
                                    { id: 'duplicates', label: 'Duplicates', count: stats.duplicates, color: 'bg-rose-500' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                            {/* Left: Controls */}
                            <div className="xl:col-span-1 space-y-6">

                                {/* Upload Box */}
                                {!selectedFile ? (
                                    <div className="space-y-4">
                                        {/* Standard Upload Box */}
                                        <div
                                            onDragOver={handleDragStandard}
                                            onDragLeave={handleDragStandard}
                                            onDrop={handleDropStandard}
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                            className={`h-36 border-2 border-dashed rounded-[24px] flex flex-col items-center justify-center transition-all cursor-pointer ${dragActiveStandard ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300 shadow-sm'}`}
                                        >
                                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                                            <Upload className={`w-6 h-6 mb-2 ${dragActiveStandard ? 'text-indigo-600' : 'text-slate-300'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Assign MCQ Source</span>
                                            <span className="text-[8px] text-slate-400 mt-0.5 italic">Click or drag to analyze MCQs</span>
                                        </div>

                                        {/* Passage Upload Box */}
                                        <div
                                            onDragOver={handleDragPassage}
                                            onDragLeave={handleDragPassage}
                                            onDrop={handleDropPassage}
                                            onClick={() => document.getElementById('passage-file-upload')?.click()}
                                            className={`h-36 border-2 border-dashed rounded-[24px] flex flex-col items-center justify-center transition-all cursor-pointer ${dragActivePassage ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-white hover:border-teal-300 shadow-sm'}`}
                                        >
                                            <input id="passage-file-upload" type="file" className="hidden" onChange={handlePassageFileChange} />
                                            <BookOpen className={`w-6 h-6 mb-2 ${dragActivePassage ? 'text-teal-600' : 'text-slate-300'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">Assign Passage Source</span>
                                            <span className="text-[8px] text-slate-400 mt-0.5 italic">Click or drag to analyze Passages</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative group">
                                        <button onClick={resetUpload} className="absolute -top-3 -right-3 p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-rose-500 shadow-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPassageMode ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {isPassageMode ? <BookOpen className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-900 truncate uppercase">{selectedFile.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">{isPassageMode ? 'PASSAGE MODE ACTIVE' : 'MCQ MODE ACTIVE'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveToDatabase}
                                            disabled={loading || isCommitting}
                                            className={`w-full py-4 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-200 active:scale-95 ${loading || isCommitting ? 'bg-slate-400 cursor-not-allowed text-white/50' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                                        >
                                            {isCommitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Finalizing Pipeline...
                                                </span>
                                            ) : 'Commit Changes'}
                                        </button>
                                    </div>
                                )}

                                {/* Validation Mode */}
                                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-500" /> Resolution Mode
                                        </h3>
                                        <button
                                            onClick={() => setAutoDetectMode(!autoDetectMode)}
                                            className={`relative h-6 w-11 rounded-full transition-colors ${autoDetectMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${autoDetectMode ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                        {autoDetectMode ? "System will scan Subject/Topic columns for automatic library placement." : "Manually map all items to a specific DB branch."}
                                    </p>

                                    {!autoDetectMode && (
                                        <div className="mt-6 space-y-4 pt-6 border-t border-slate-50">
                                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" value={subject} onChange={(e) => setSubject(e.target.value)}>
                                                <option value="">Select Subject</option>
                                                {filteredSubjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <select disabled={!subject} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold disabled:opacity-50" value={topic} onChange={(e) => setTopic(e.target.value)}>
                                                <option value="">Select Topic</option>
                                                {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                            <select disabled={!topic} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold disabled:opacity-50" value={subtopic} onChange={(e) => setSubtopic(e.target.value)}>
                                                <option value="">Select Subtopic (Optional)</option>
                                                {subtopicsList.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                            </select>
                                            <div className="pt-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">Global Test Section Mapping</p>
                                                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" value={globalTestSection} onChange={(e) => setGlobalTestSection(e.target.value)}>
                                                    <option value="">None (Global Bank)</option>
                                                    {allHierarchy.testSections.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <button onClick={handleDownloadTemplate} className="w-full py-3.5 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white hover:border-slate-300 transition-all">
                                        <Download className="w-4 h-4 text-indigo-500" /> Download MCQ Template
                                    </button>
                                    <button onClick={handleDownloadPassageTemplate} className="w-full py-3.5 border border-dashed border-teal-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-teal-600/70 uppercase tracking-widest hover:bg-teal-50/20 hover:border-teal-300 transition-all">
                                        <Download className="w-4 h-4 text-teal-500" /> Download Passage Template
                                    </button>
                                </div>
                            </div>

                            {/* Center: Table View */}
                            <div className="xl:col-span-3">
                                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">

                                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                                <SearchCode className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">{activeTab === 'unidentified' ? 'Mapping Queue' : 'Activity Stream'}</h2>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activeTab === 'all' ? 'Processing all content' : activeTab === 'unidentified' ? 'Requires manual classification' : 'Filtered system duplicates'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {activeTab === 'duplicates' && stats.duplicates > 0 && (
                                                <button
                                                    onClick={rejectAllDuplicates}
                                                    className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
                                                >
                                                    Discard All Duplicates
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Global Mapping Helper - Subjects */}
                                    {activeTab === 'unidentified' && Object.keys(unresolvedMappings.subjects).some(k => unresolvedMappings.subjects[k] === null) && (
                                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {Object.entries(unresolvedMappings.subjects).filter(([_, id]) => id === null).map(([name]) => (
                                                    <div key={name} className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Map Subject <span className="text-slate-900">"{name}"</span> to:</span>
                                                        <select
                                                            className="flex-1 bg-slate-50 text-[10px] font-bold px-4 py-2 rounded-xl outline-none border border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                            onChange={(e) => bulkApplyResolution(name, 'subject', parseInt(e.target.value))}
                                                        >
                                                            <option value="">Choose DB Subject...</option>
                                                            {allHierarchy.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Global Mapping Helper - Entities (Unified Uni/TS) */}
                                    {activeTab === 'unidentified' && Object.keys(unresolvedMappings.entityMappings).some(k => unresolvedMappings.entityMappings[k] === null) && (
                                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {Object.entries(unresolvedMappings.entityMappings).filter(([_, res]) => res === null).map(([name]) => (
                                                    <div key={name} className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Map Entity <span className="text-slate-900">"{name}"</span> to:</span>
                                                        <select
                                                            className="flex-1 bg-slate-50 text-[10px] font-bold px-4 py-2 rounded-xl outline-none border border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (!val) return;
                                                                const isUni = val.startsWith('uni-');
                                                                const id = parseInt(val.replace('uni-', '').replace('ts-', ''));
                                                                bulkApplyResolution(name, 'entity', { type: isUni ? 'uni' : 'ts', id });
                                                            }}
                                                        >
                                                            <option value="">Choose DB Entity...</option>
                                                            <optgroup label="Universities">
                                                                {allHierarchy.universities.map(u => <option key={u.id} value={`uni-${u.id}`}>{u.name}</option>)}
                                                            </optgroup>
                                                            <optgroup label="Test Sections">
                                                                {allHierarchy.testSections.map(ts => <option key={ts.id} value={`ts-${ts.id}`}>{ts.name}</option>)}
                                                            </optgroup>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                                        {previewData.length > 0 ? (
                                            <table className="w-full text-left border-collapse table-fixed">
                                                <thead className="sticky top-0 bg-white z-20 border-b border-slate-100">
                                                    <tr>
                                                        <th className="w-16 px-8 py-6">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                checked={filteredData.length > 0 && filteredData.every(d => selectedRows.has(d.index))}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                        <th className="w-[450px] px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Narrative</th>
                                                        <th className="w-[350px] px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hierarchy mapping</th>
                                                        <th className="w-[150px] px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Integrity</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredData.map((d) => (
                                                        <tr key={d.index} className={`transition-colors ${selectedRows.has(d.index) ? 'bg-indigo-50/10' : ''}`}>
                                                            <td className="px-8 py-8 align-top">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    checked={selectedRows.has(d.index)}
                                                                    onChange={() => toggleRowSelection(d.index)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-8 align-top">
                                                                <div className="max-w-md relative group">
                                                                    <button 
                                                                        onClick={() => startEditing(d.index, d.original)}
                                                                        className="absolute -right-4 top-0 p-2 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white shadow-sm"
                                                                        title="Edit Narrative"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <div className="text-[13px] font-medium text-slate-700 leading-relaxed pr-6">
                                                                        <MarkdownRenderer content={getRowValue(d.original, ['question', 'text']) || ''} />
                                                                    </div>

                                                                    {/* Passage Preview */}
                                                                    {(d.original.passage_content || d.original.passage_title) && (
                                                                        <div className="mt-2 mb-3 p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/50">
                                                                            <div className="flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                                                                <BookOpen className="w-3 h-3" /> Passage: {d.original.passage_title || 'Untitled Passage'}
                                                                            </div>
                                                                            {d.original.passage_content && (
                                                                                <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                                                                                    {d.original.passage_content}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Explanation Preview - Always show if available for clarity */}
                                                                    {getRowValue(d.original, ['explanation', 'desc', 'reason']) && (
                                                                        <div className="mt-4 p-4 bg-teal-50/40 rounded-2xl border border-teal-100/30">
                                                                            <div className="flex items-center gap-2 text-[9px] font-black text-teal-600 uppercase tracking-widest mb-2">
                                                                                <Info className="w-3.5 h-3.5" /> Explanation provided
                                                                            </div>
                                                                            <div className="text-[11px] text-teal-800 font-medium italic leading-relaxed">
                                                                                <MarkdownRenderer content={getRowValue(d.original, ['explanation', 'desc', 'reason'])?.toString() || ''} />
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Options View - Sleeker */}
                                                                    <div className="mt-4">
                                                                        <button
                                                                            onClick={() => setExpandedOptions(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(d.index)) next.delete(d.index);
                                                                                else next.add(d.index);
                                                                                return next;
                                                                            })}
                                                                            className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                                                                        >
                                                                            {expandedOptions.has(d.index) ? 'Collapse Options' : 'Expand Options'}
                                                                            <ArrowRight className={`w-3 h-3 transition-transform ${expandedOptions.has(d.index) ? 'rotate-90' : ''}`} />
                                                                        </button>

                                                                        {expandedOptions.has(d.index) && (
                                                                            <div className="grid grid-cols-1 gap-1.5 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                                {['A', 'B', 'C', 'D'].map(opt => {
                                                                                    const val = getRowValue(d.original, [`option ${opt.toLowerCase()}`, opt.toLowerCase()]);
                                                                                    const correct = (getRowValue(d.original, ['correct', 'answer']) || '').toString().toUpperCase() === opt;
                                                                                    return (
                                                                                        <div key={opt} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[11px] ${correct ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-50 text-slate-500'}`}>
                                                                                            <span className="opacity-40">{opt}.</span>
                                                                                            <MarkdownRenderer content={val?.toString() || '-'} />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8 align-top">
                                                                <div className="space-y-6">
                                                                    {/* Subject Resolution */}
                                                                    <div>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Excel: {d.excelSubj}</span>
                                                                            {d.resolvedSubjId && !manualResolutions[d.index]?.subjId && (
                                                                                <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">Auto-Matched</span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex gap-2 items-center">
                                                                            <select
                                                                                className={`flex-1 bg-white border ${d.resolvedSubjId ? 'border-slate-200' : 'border-amber-300'} text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                                                                                value={d.resolvedSubjId || ''}
                                                                                onChange={(e) => updateManualResolution(d.index, 'subjId', parseInt(e.target.value) || null)}
                                                                            >
                                                                                <option value="">Map Subject...</option>
                                                                                {allHierarchy.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                            </select>
                                                                            {manualResolutions[d.index]?.subjId && (
                                                                                <button
                                                                                    title="Apply to all items with same label"
                                                                                    onClick={() => bulkApplyResolution(d.excelSubj, 'subject', manualResolutions[d.index]!.subjId!)}
                                                                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                                                                >
                                                                                    <Layers className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Topic Resolution */}
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">Excel: {d.excelTopic}</p>
                                                                        <div className="flex gap-2 items-center">
                                                                            <select
                                                                                disabled={!d.resolvedSubjId}
                                                                                className={`flex-1 bg-white border ${d.resolvedTopicId ? 'border-slate-200' : 'border-amber-300'} text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 transition-all`}
                                                                                value={d.resolvedTopicId || ''}
                                                                                onChange={(e) => updateManualResolution(d.index, 'topicId', parseInt(e.target.value) || null)}
                                                                            >
                                                                                <option value="">Map Topic...</option>
                                                                                {allHierarchy.topics.filter(t => t.subject_id === d.resolvedSubjId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                            </select>
                                                                                {manualResolutions[d.index]?.topicId && (
                                                                                    <button
                                                                                        title="Apply to all items with same label"
                                                                                        onClick={() => {
                                                                                            const topicKey = d.excelSubj ? `${d.excelSubj}|${d.excelTopic}` : d.excelTopic;
                                                                                            bulkApplyResolution(topicKey, 'topic', manualResolutions[d.index]!.topicId!);
                                                                                        }}
                                                                                        className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                                                                    >
                                                                                        <Layers className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Subtopic Resolution */}
                                                                    {(d.excelSubtopic || d.resolvedSubtopicId) && (
                                                                        <div>
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">Excel: {d.excelSubtopic}</p>
                                                                            <div className="flex gap-2 items-center">
                                                                                <select
                                                                                    disabled={!d.resolvedTopicId}
                                                                                    className={`flex-1 bg-white border border-slate-200 text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 transition-all`}
                                                                                    value={d.resolvedSubtopicId || ''}
                                                                                    onChange={(e) => updateManualResolution(d.index, 'subtopicId', parseInt(e.target.value) || null)}
                                                                                >
                                                                                    <option value="">Map Subtopic (Optional)...</option>
                                                                                    {allHierarchy.subtopics.filter(st => st.topic_id === d.resolvedTopicId).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                                                                </select>
                                                                                {manualResolutions[d.index]?.subtopicId && (
                                                                                    <button
                                                                                        title="Apply to all items with same label"
                                                                                        onClick={() => {
                                                                                            const subtopicKey = d.excelTopic ? `${d.excelTopic}|${d.excelSubtopic}` : d.excelSubtopic;
                                                                                            bulkApplyResolution(subtopicKey, 'subtopic', manualResolutions[d.index]!.subtopicId!);
                                                                                        }}
                                                                                        className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                                                                    >
                                                                                        <Layers className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* University Resolution */}
                                                                    {/* Simplified Mapping Context */}
                                                                    <div className="mt-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Source: {d.excelUni || d.excelTs || 'None'}</p>
                                                                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">{d.excelUni ? 'University' : 'Test Section'}</span>
                                                                        </div>
                                                                        <div className="flex gap-2 items-center">
                                                                            <select
                                                                                className={`flex-1 bg-white border ${d.resolvedUniId || d.resolvedTsId ? 'border-slate-200' : 'border-amber-300'} text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                                                                                value={d.resolvedUniId ? `uni-${d.resolvedUniId}` : d.resolvedTsId ? `ts-${d.resolvedTsId}` : ''}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (!val || val === 'null') {
                                                                                        updateManualResolution(d.index, 'uniId', null);
                                                                                        updateManualResolution(d.index, 'tsId', null);
                                                                                    } else if (val.startsWith('uni-')) {
                                                                                        updateManualResolution(d.index, 'uniId', parseInt(val.replace('uni-', '')));
                                                                                        updateManualResolution(d.index, 'tsId', null);
                                                                                    } else if (val.startsWith('ts-')) {
                                                                                        updateManualResolution(d.index, 'tsId', parseInt(val.replace('ts-', '')));
                                                                                        updateManualResolution(d.index, 'uniId', null);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <option value="">Map Target Entity...</option>
                                                                                <option value="null">None (Global Bank)</option>
                                                                                <optgroup label="Universities">
                                                                                    {allHierarchy.universities.map(u => <option key={u.id} value={`uni-${u.id}`}>{u.name}</option>)}
                                                                                </optgroup>
                                                                                <optgroup label="Test Sections">
                                                                                    {allHierarchy.testSections.map(ts => <option key={ts.id} value={`ts-${ts.id}`}>{ts.name}</option>)}
                                                                                </optgroup>
                                                                            </select>
                                                                            {(manualResolutions[d.index] && ('uniId' in manualResolutions[d.index] || 'tsId' in manualResolutions[d.index])) && (
                                                                                <button
                                                                                    title="Apply to all items with same label"
                                                                                    onClick={() => {
                                                                                        const isUni = !!manualResolutions[d.index]?.uniId;
                                                                                        bulkApplyResolution(
                                                                                            d.excelUni || d.excelTs, 
                                                                                            'entity', 
                                                                                            { type: isUni ? 'uni' : 'ts', id: isUni ? manualResolutions[d.index]!.uniId! : manualResolutions[d.index]!.tsId! }
                                                                                        );
                                                                                    }}
                                                                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                                                                                >
                                                                                    <Layers className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-8 align-top text-right">
                                                                <div className="flex flex-col items-end gap-3">
                                                                    {d.isValid ? (
                                                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                                            <CheckCircle className="w-3.5 h-3.5" /> Ready
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end gap-1.5">
                                                                            {!d.hierarchyValid && (
                                                                                <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 text-[8px] font-black uppercase tracking-widest">Unresolved</div>
                                                                            )}
                                                                            {d.dupInfo && (
                                                                                <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100 text-[8px] font-black uppercase tracking-widest">Duplicate</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="h-[600px] flex flex-col items-center justify-center p-12 text-center">
                                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                    <FileWarning className="w-10 h-10 text-slate-200" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Library Analyzer Offline</h3>
                                                <p className="text-slate-400 max-w-sm mt-2 font-medium">Please link a spreadsheet to initiate the hierarchical resolution pipeline.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* --- QUICK EDIT MODAL --- */}
                {editingIndex !== null && editFormData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <Pencil className="w-5 h-5 text-indigo-600" /> Refine Narrative
                                    </h3>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Editing Row #{editingIndex + 1}</p>
                                </div>
                                <button onClick={() => setEditingIndex(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></button>
                            </div>
                            
                            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                                {/* Question Text */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Text</label>
                                    <textarea 
                                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[120px]"
                                        value={editFormData.question}
                                        onChange={(e) => setEditFormData({...editFormData, question: e.target.value})}
                                    />
                                </div>

                                {/* Options Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    {[
                                        {key: 'option_a', label: 'Option A'},
                                        {key: 'option_b', label: 'Option B'},
                                        {key: 'option_c', label: 'Option C'},
                                        {key: 'option_d', label: 'Option D'},
                                    ].map(opt => (
                                        <div key={opt.key} className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{opt.label}</label>
                                                <input 
                                                    type="radio" 
                                                    name="correct_opt"
                                                    checked={editFormData.correct_option === opt.label.split(' ')[1]}
                                                    onChange={() => setEditFormData({...editFormData, correct_option: opt.label.split(' ')[1]})}
                                                    className="w-4 h-4 accent-emerald-500"
                                                />
                                            </div>
                                            <input 
                                                type="text"
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={editFormData[opt.key]}
                                                onChange={(e) => setEditFormData({...editFormData, [opt.key]: e.target.value})}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Explanation */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Rationale / Explanation</label>
                                    <textarea 
                                        className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                                        value={editFormData.explanation}
                                        onChange={(e) => setEditFormData({...editFormData, explanation: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                <button onClick={() => setEditingIndex(null)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                                <button 
                                    onClick={saveEdit}
                                    className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" /> Save Narrative
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Footer />
            </div>
        </div>
    );
}
