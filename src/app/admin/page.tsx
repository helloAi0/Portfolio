'use client';

import { TAXONOMY } from '@/lib/taxonomy';
import { DIFFICULTIES } from '@/lib/projectHelpers';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import AutomationPanel from '@/components/admin/AutomationPanel';
import ProfileEditorPanel from '@/components/admin/ProfileEditorPanel';
import EnquiriesPanel from '@/components/admin/EnquiriesPanel';
import VisitorChatsPanel from '@/components/admin/VisitorChatsPanel';
import JobAgentPanel from '@/components/admin/JobAgentPanel';
import OutreachPanel from '@/components/admin/OutreachPanel';
import CertificateQueuePanel from '@/components/admin/CertificateQueuePanel';
import ManualEntryPanel from '@/components/admin/ManualEntryPanel';
import ProjectsStudioPanel from '@/components/admin/ProjectsStudioPanel';
import SkillsPanel from '@/components/admin/SkillsPanel';
import ResumeStudioPanel from '@/components/admin/ResumeStudioPanel';
import { RecordRow } from '@/components/admin/RecordRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  LayoutDashboard,
  Github,
  Code2,
  Linkedin,
  FolderGit2,
  Cpu,
  Award,
  Trophy,
  Briefcase,
  History,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  LogOut,
  AlertTriangle,
  Send,
  Eye,
  Layers,
  EyeOff,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'automation'
  | 'manual'
  | 'inbox'
  | 'profile'
  | 'github'
  | 'leetcode'
  | 'geeksforgeeks'
  | 'linkedin'
  | 'projects'
  | 'resume'
  | 'skills'
  | 'certificates'
  | 'achievements'
  | 'experience'
  | 'lamo-questions'
  | 'visitor-chats'
  | 'job-agent'
  | 'outreach'
  | 'lamo-copilot'
  | 'sync-history'
  | 'settings';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  // Deep links from Telegram / email cards, e.g. /admin#job-agent
  useEffect(() => { const go = () => { const h = window.location.hash.slice(1); if (['certificates', 'job-agent', 'outreach', 'visitor-chats'].includes(h)) setActiveTab(h as AdminTab); }; go(); window.addEventListener('hashchange', go); return () => window.removeEventListener('hashchange', go); }, []);
  const [health, setHealth] = useState<any | null>(null);
  const [resumeSet, setResumeSet] = useState<boolean | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [recordBusy, setRecordBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); setPaletteQuery(''); }
      else if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [codingStats, setCodingStats] = useState<{ leetcode: any; gfg: any }>({ leetcode: null, gfg: null });
  const [linkedinPosts, setLinkedinPosts] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // Week 3 LAMO States
  const [lamoQuestions, setLamoQuestions] = useState<any[]>([]);
  const [answeringQId, setAnsweringQId] = useState<string | null>(null);
  const [ownerAnswerInput, setOwnerAnswerInput] = useState('');
  const [notifyVisitorOnApprove, setNotifyVisitorOnApprove] = useState(true);
  const [answerVisibility, setAnswerVisibility] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
  const [contextRequestInput, setContextRequestInput] = useState('');

  // Copilot & Bio Review States
  const [bioReview, setBioReview] = useState<any | null>(null);
  const [bioFeedback, setBioFeedback] = useState('');
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [suggestedSkillsList, setSuggestedSkillsList] = useState<any[]>([]);
  const [selectedProjectIdForEnhance, setSelectedProjectIdForEnhance] = useState('');
  const [enhancementDraft, setEnhancementDraft] = useState<any | null>(null);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);

  // Form states
  const [newPost, setNewPost] = useState({ title: '', contentExcerpt: '', postUrl: '', isPublic: true, isApproved: true });
  const [newCert, setNewCert] = useState({ title: '', issuingOrganization: '', issueDate: '', credentialId: '', credentialUrl: '', description: '', isPublic: true, ownerApproved: true });
  const [newAch, setNewAch] = useState({ title: '', category: 'Competition', organization: '', date: '', rankOrAward: '', description: '', proofUrl: '', isPublic: true, ownerApproved: true });
  const [newExp, setNewExp] = useState({ roleTitle: '', organization: '', organizationType: 'Research Lab', startDate: '', endDate: '', isCurrent: false, description: '', keyContributions: '', isPublic: true, verified: true });

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 9000);
  };

  // Initial data loading
  useEffect(() => {
    loadAllData();
    // Run once on mount; loadAllData is redefined each render and must not re-trigger loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Check auth / fetch data in parallel
      const [ghRes, csRes, liRes, skRes, certRes, achRes, expRes, logRes, intRes, lamoQRes, bioRes, copilotRes] = await Promise.all([
        fetch('/api/admin/github'),
        fetch('/api/admin/coding-stats'),
        fetch('/api/admin/linkedin'),
        fetch('/api/admin/skills'),
        fetch('/api/admin/certificates'),
        fetch('/api/admin/achievements'),
        fetch('/api/admin/experience'),
        fetch('/api/admin/sync-logs'),
        fetch('/api/admin/integrations'),
        fetch('/api/admin/lamo/questions'),
        fetch('/api/admin/lamo/biography'),
        fetch('/api/admin/lamo/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'GET_AUDIT_LOGS' }),
        }),
      ]);

      if (ghRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      if ([csRes, liRes, skRes, certRes, achRes, expRes, logRes, intRes].some((r) => r.status === 401)) {
        router.push('/admin/login');
        return;
      }

      // One failing endpoint must never blank the whole dashboard: read each response defensively.
      const failed: string[] = [];
      const read = async (res: Response, name: string, fallback: any) => {
        if (!res.ok) { failed.push(name); return fallback; }
        try { return await res.json(); } catch { failed.push(name); return fallback; }
      };
      const arr = (v: any) => (Array.isArray(v) ? v : []);
      const ghData = await read(ghRes, 'GitHub', {});
      const csData = await read(csRes, 'Coding stats', null);
      const liData = await read(liRes, 'LinkedIn', {});
      const skData = await read(skRes, 'Skills', {});
      const certData = await read(certRes, 'Certificates', {});
      const achData = await read(achRes, 'Achievements', {});
      const expData = await read(expRes, 'Experience', {});
      const logData = await read(logRes, 'Sync logs', {});
      const intData = await read(intRes, 'Integrations', {});
      const lamoQData = lamoQRes.ok ? await lamoQRes.json().catch(() => ({ data: [] })) : { data: [] };
      const bioData = bioRes.ok ? await bioRes.json().catch(() => ({ data: null })) : { data: null };
      const copilotData = copilotRes.ok ? await copilotRes.json().catch(() => ({ data: [] })) : { data: [] };

      try { const h = await fetch('/api/health', { cache: 'no-store' }); if (h.ok) setHealth(await h.json()); } catch { /* health card is optional */ }
      try { const rr = await fetch('/api/admin/resume'); if (rr.ok) { const d = (await rr.json())?.data; setResumeSet(Boolean(d?.pdfUrl || d?.pdfUrlB)); } } catch { /* optional */ }
      try {
        const eq = await fetch('/api/admin/enquiries');
        const ej = eq.ok ? await eq.json() : { data: [] };
        setUnreadEnquiries(arr(ej.data).filter((x: any) => x.status === 'UNREAD').length);
      } catch { /* inbox badge is optional */ }
      setGithubRepos(arr(ghData.data));
      setCodingStats(csData && typeof csData === 'object' ? csData : { leetcode: null, gfg: null });
      setLinkedinPosts(arr(liData.data));
      setSkills(arr(skData.data));
      setCertificates(arr(certData.data).filter((c: any) => (c.reviewStatus ?? 'approved') === 'approved')); // drafts live in the staging queue
      setAchievements(arr(achData.data));
      setExperiences(arr(expData.data));
      setSyncLogs(arr(logData.data));
      setIntegrations(arr(intData.data));
      setLamoQuestions(arr(lamoQData.data));
      if (bioData.data) setBioReview(bioData.data);
      if (copilotData.data) setRecentAuditLogs(arr(copilotData.data));
      if (failed.length) showMsg('error', `Could not load: ${failed.join(', ')}. The rest is shown. Try Refresh.`);
    } catch (err) {
      showMsg('error', 'Failed to load citadel dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [unreadEnquiries, setUnreadEnquiries] = useState(0);

  /** Shows the server's own explanation (or a fallback); sends the owner to login if the session expired. */
  const reportFail = async (res: Response, fallback: string) => {
    if (res.status === 401) { router.push('/admin/login'); return; }
    const e = await res.json().catch(() => ({}));
    showMsg('error', e?.error || fallback);
  };

  /** Publish / unpublish / delete for certificates and achievements. */
  const handleRecordToggle = async (kind: 'certificates' | 'achievements', id: string, publish: boolean) => {
    setRecordBusy(true);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerApproved: publish, isPublic: publish }) });
      if (res.ok) { showMsg('success', publish ? 'Published. It is now visible on the site.' : 'Unpublished. It is hidden from the site.'); await loadAllData(); }
      else await reportFail(res, 'Could not update the record.');
    } finally { setRecordBusy(false); }
  };

  const handleRecordDelete = async (kind: 'certificates' | 'achievements', id: string, title: string) => {
    if (!confirm(`Delete "${title}" permanently? Its uploaded file is deleted too. This cannot be undone.`)) return;
    setRecordBusy(true);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
      if (res.ok) { showMsg('success', 'Deleted.'); await loadAllData(); }
      else await reportFail(res, 'Could not delete the record.');
    } finally { setRecordBusy(false); }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  // Actions
  const handleTriggerGithubSync = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/github', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', `GitHub sync completed: ${data.reposFetched} fetched, ${data.reposUpserted} upserted, ${data.reposClassified} classified.`);
        loadAllData();
      } else {
        showMsg('error', data.errorMessage || 'GitHub sync failed.');
      }
    } catch {
      showMsg('error', 'Network error during GitHub sync.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCodingSync = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coding-stats', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', `Coding platforms synced (LeetCode: ${data.leetcode}, GFG: ${data.gfg}).`);
        loadAllData();
      } else {
        showMsg('error', 'Failed to sync coding platforms.');
      }
    } catch {
      showMsg('error', 'Network error during coding sync.');
    } finally {
      setLoading(false);
    }
  };

  const [repoDrafts, setRepoDrafts] = useState<Record<string, { categorySlug?: string; difficulty?: string }>>({});

  const handleApproveRepo = async (id: string, action: 'APPROVE' | 'REJECT' | 'SKIP' | 'UNPUBLISH', extra: Record<string, unknown> = {}) => {
    try {
      const res = await fetch(`/api/admin/github/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        showMsg('success', action === 'APPROVE' ? 'Project published.' : `Repository ${action.toLowerCase()}ed.`);
        loadAllData();
      } else {
        const err = await res.json().catch(() => ({}));
        showMsg('error', err.error || 'Action failed.');
      }
    } catch {
      showMsg('error', 'Failed to update repository approval.');
    }
  };

  const handleUpdateSkill = async (id: string, updates: Record<string, any>) => {
    try {
      const res = await fetch('/api/admin/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (res.ok) {
        showMsg('success', 'Skill updated in knowledge graph.');
        loadAllData();
      } else {
        await reportFail(res, 'Could not update the skill.');
      }
    } catch {
      showMsg('error', 'Failed to update skill.');
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let filePath: string | undefined;
      if (certFile) {
        const fd = new FormData();
        fd.append('file', certFile);
        const up = await fetch('/api/admin/uploads', { method: 'POST', body: fd });
        if (!up.ok) { await reportFail(up, 'The file could not be uploaded. Nothing was saved.'); return; }
        filePath = (await up.json()).url;
      }
      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCert, filePath }),
      });
      if (res.ok) {
        showMsg('success', 'Certificate recorded.');
        setCertFile(null);
        setNewCert({ title: '', issuingOrganization: '', issueDate: '', credentialId: '', credentialUrl: '', description: '', isPublic: true, ownerApproved: true });
        loadAllData();
      } else {
        await reportFail(res, 'Could not save the certificate.');
      }
    } catch {
      showMsg('error', 'Failed to create certificate.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAch),
      });
      if (res.ok) {
        showMsg('success', 'Achievement recorded.');
        setNewAch({ title: '', category: 'Competition', organization: '', date: '', rankOrAward: '', description: '', proofUrl: '', isPublic: true, ownerApproved: true });
        loadAllData();
      } else {
        await reportFail(res, 'Could not save the achievement.');
      }
    } catch {
      showMsg('error', 'Failed to create achievement.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExp),
      });
      if (res.ok) {
        showMsg('success', 'Experience record created.');
        setNewExp({ roleTitle: '', organization: '', organizationType: 'Research Lab', startDate: '', endDate: '', isCurrent: false, description: '', keyContributions: '', isPublic: true, verified: true });
        loadAllData();
      } else {
        await reportFail(res, 'Could not save the experience.');
      }
    } catch {
      showMsg('error', 'Failed to create experience.');
    } finally {
      setSaving(false);
    }
  };

  // Week 3 Question Handlers
  const handleApproveQuestion = async (qId: string) => {
    if (!ownerAnswerInput.trim()) {
      showMsg('error', 'Please enter an approved answer.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lamo/questions/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE_ANSWER',
          ownerAnswer: ownerAnswerInput.trim(),
          notifyVisitor: notifyVisitorOnApprove,
          visibility: answerVisibility,
        }),
      });
      if (res.ok) {
        {
          const out = await res.json().catch(() => ({}));
          const mail = out?.email;
          showMsg('success', (answerVisibility === 'PUBLIC' ? 'Answer saved and LAMO may reuse it. ' : 'Answer saved privately (LAMO will not reuse it). ') + (mail?.attempted ? (mail.success ? 'Visitor emailed.' : `Visitor email NOT sent: ${mail.error}`) : ''));
        }
        setAnsweringQId(null);
        setOwnerAnswerInput('');
        loadAllData();
      } else {
        const err = await res.json();
        showMsg('error', err.error || 'Failed to approve question.');
      }
    } catch {
      showMsg('error', 'Network error approving question.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectQuestion = async (qId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lamo/questions/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT' }),
      });
      if (res.ok) {
        showMsg('success', 'Question rejected.');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestContext = async (qId: string) => {
    const text = contextRequestInput.trim();
    if (!text) { showMsg('error', 'Write what context you need from the visitor.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lamo/questions/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_CONTEXT', contextRequest: text }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok) {
        showMsg('success', out?.email?.attempted ? (out.email.success ? 'Context request emailed to the visitor.' : `Saved, but email NOT sent: ${out.email.error}`) : 'Saved. The visitor left no email, so nothing was sent.');
        setContextRequestInput('');
        loadAllData();
      } else showMsg('error', out.error || 'Failed to request context.');
    } catch { showMsg('error', 'Network error.'); } finally { setLoading(false); }
  };

  const handleMarkPrivateQuestion = async (qId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lamo/questions/${qId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_PRIVATE' }),
      });
      if (res.ok) {
        showMsg('success', 'Question marked as private/declined.');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Permanently delete this question record?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lamo/questions/${qId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showMsg('success', 'Question deleted.');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Week 3 Copilot & Biography Handlers
  const handleRunAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'AUDIT_COMPLETENESS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuditResult(data.data);
        showMsg('success', `Completeness audit completed: ${data.data.score}% score.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestSkills = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUGGEST_SKILLS' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestedSkillsList(data.data || []);
        showMsg('success', `Identified ${data.data?.length || 0} skills from repositories.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDraftEnhancement = async () => {
    if (!selectedProjectIdForEnhance) {
      showMsg('error', 'Select a project to enhance.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DRAFT_PROJECT_ENHANCEMENT',
          projectId: selectedProjectIdForEnhance,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnhancementDraft(data.data);
        showMsg('success', 'Generated imperial enhancement draft.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyEnhancement = async () => {
    if (!enhancementDraft) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLY_PROJECT_ENHANCEMENT',
          projectId: enhancementDraft.projectId,
          proposedDescription: enhancementDraft.proposedDescription,
          explanation: enhancementDraft.changeExplanation,
        }),
      });
      if (res.ok) {
        showMsg('success', 'Applied enhanced description. Audit record logged for rollback.');
        setEnhancementDraft(null);
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (auditId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ROLLBACK',
          auditId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('success', data.data.message || 'Rollback successful.');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBioReview = async (force: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE', forceRefresh: force }),
      });
      const data = await res.json();
      if (res.ok) {
        setBioReview(data.data);
        showMsg('success', 'Generated fresh biography review against recent milestones.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBioReview = async (reviewId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', reviewId, feedback: bioFeedback }),
      });
      if (res.ok) {
        showMsg('success', 'Biography approved and applied to live portfolio profile.');
        setBioFeedback('');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineBioReview = async (reviewId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lamo/biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DECLINE', reviewId, feedback: bioFeedback }),
      });
      if (res.ok) {
        showMsg('success', 'Biography review declined.');
        setBioFeedback('');
        loadAllData();
      }
    } finally {
      setLoading(false);
    }
  };

  type NavItem = { id: AdminTab; label: string; icon: any; count?: number; hot?: boolean };
  const pendingRepos = githubRepos.filter((r) => r.classificationStatus === 'SUGGESTED').length;
  const pendingQuestions = lamoQuestions.filter((q) => q.status === 'PENDING_OWNER').length;
  const hiddenCerts = certificates.filter((c) => !(c.ownerApproved && c.isPublic)).length;
  const hiddenAchs = achievements.filter((c) => !(c.ownerApproved && c.isPublic)).length;
  const navGroups: { title: string; items: NavItem[] }[] = [
    { title: 'Start', items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
    { title: 'Content', items: [
      { id: 'projects', label: 'Projects', icon: Layers },
      { id: 'skills', label: 'Skills', icon: Cpu, count: skills.length },
      { id: 'certificates', label: 'Certificates', icon: Award, count: certificates.length, hot: hiddenCerts > 0 },
      { id: 'achievements', label: 'Achievements & Honors', icon: Trophy, count: achievements.length, hot: hiddenAchs > 0 },
      { id: 'resume', label: 'Resume (PDF)', icon: Award, hot: resumeSet === false },
      { id: 'profile', label: 'Profile & Education', icon: Settings },
      { id: 'manual', label: 'Manual Entry', icon: Settings },
    ] },
    { title: 'Inbox', items: [
      { id: 'inbox', label: 'Contact Messages', icon: Send, count: unreadEnquiries, hot: unreadEnquiries > 0 },
      { id: 'visitor-chats', label: 'Visitor Chats', icon: Send },
      { id: 'lamo-questions', label: 'LAMO Questions', icon: Send, count: pendingQuestions, hot: pendingQuestions > 0 },
    ] },
    { title: 'Automation', items: [
      { id: 'job-agent', label: 'Job Agent', icon: Send },
      { id: 'outreach', label: 'Outreach', icon: Send },
      { id: 'automation', label: 'Auto-Sync & Quick Add', icon: RefreshCw },
      { id: 'github', label: 'GitHub Repositories', icon: Github, count: githubRepos.length, hot: pendingRepos > 0 },
      { id: 'leetcode', label: 'LeetCode', icon: Code2 },
      { id: 'geeksforgeeks', label: 'GeeksforGeeks', icon: Code2 },
      { id: 'sync-history', label: 'Sync Logs', icon: History, count: syncLogs.length },
      { id: 'settings', label: 'Integrations', icon: Settings },
    ] },
    { title: 'LAMO', items: [{ id: 'lamo-copilot', label: 'LAMO Copilot & Bio', icon: Cpu }] },
  ];
  const navTabs: NavItem[] = navGroups.flatMap((g) => g.items);
  const go = (id: AdminTab) => { setActiveTab(id); setPaletteOpen(false); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const attention = ([
    { label: 'GitHub repositories waiting for your decision', count: pendingRepos, tab: 'github', tone: 'amber' },
    { label: 'Unread contact messages', count: unreadEnquiries, tab: 'inbox', tone: 'sky' },
    { label: 'LAMO questions waiting for your answer', count: pendingQuestions, tab: 'lamo-questions', tone: 'amber' },
    { label: 'Certificates hidden from the site', count: hiddenCerts, tab: 'certificates', tone: 'neutral' },
    { label: 'Achievements hidden from the site', count: hiddenAchs, tab: 'achievements', tone: 'neutral' },
    { label: 'Resume PDF not uploaded yet (the Resume page shows “Coming soon”)', count: resumeSet === false ? 1 : 0, tab: 'resume', tone: 'amber' },
  ] as { label: string; count: number; tab: AdminTab; tone: string }[]).filter((x) => x.count > 0);
  const toneCls: Record<string, string> = { amber: 'bg-amber-400', sky: 'bg-sky-400', neutral: 'bg-neutral-500' };
  const paletteHits = navTabs.filter((t) => t.label.toLowerCase().includes(paletteQuery.trim().toLowerCase()));
  const chip = (ok: boolean, label: string, hint: string) => (
    <div key={label} className={`rounded-lg border px-3 py-2 ${ok ? 'border-emerald-400/30 bg-emerald-400/[.06]' : 'border-white/10 bg-white/[.02]'}`}>
      <p className={`text-xs font-mono ${ok ? 'text-emerald-300' : 'text-neutral-300'}`}>{ok ? '✓' : '○'} {label}</p>
      {!ok && <p className="text-[10px] text-neutral-500 mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif font-black text-2xl text-white">Command Desk</h1>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${health?.database?.status === 'CONNECTED' ? 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10' : 'border-neutral-600 text-neutral-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.database?.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
              {health ? (health.database?.status === 'CONNECTED' ? `Live · ${health.database.latencyMs} ms` : 'Database problem') : 'Checking…'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">Everything on the public site is managed from here. Nothing appears until you publish it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setPaletteOpen(true); setPaletteQuery(''); }} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-neutral-400 hover:text-white hover:border-white/25 transition">
            Jump to… <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Ctrl K</kbd>
          </button>
          <Button onClick={loadAllData} variant="outline" size="sm" icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>Refresh</Button>
          <Button onClick={handleLogout} variant="secondary" size="sm" icon={<LogOut className="w-3.5 h-3.5" />}>Log out</Button>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md shadow-2xl p-4 rounded-xl text-xs font-mono flex items-center gap-2 backdrop-blur ${message.type === 'success' ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-200' : 'bg-red-950/90 border border-red-500/40 text-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} aria-label="Dismiss" className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Command palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[16vh] px-4" onClick={() => setPaletteOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0e16] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <input autoFocus value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && paletteHits[0]) go(paletteHits[0].id); }} placeholder="Where do you want to go?" className="w-full bg-transparent px-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none border-b border-white/10" />
            <ul className="max-h-72 overflow-y-auto py-1">
              {paletteHits.map((t) => { const I = t.icon; return (
                <li key={t.id}><button onClick={() => go(t.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white text-left"><I className="w-4 h-4 text-gold-400" />{t.label}{t.count ? <span className="ml-auto text-[10px] font-mono text-neutral-500">{t.count}</span> : null}</button></li>
              ); })}
              {paletteHits.length === 0 && <li className="px-4 py-3 text-xs text-neutral-500">Nothing matches.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Layout: sticky grouped sidebar + panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <nav aria-label="Admin sections" className="lg:col-span-3 xl:col-span-2 lg:sticky lg:top-24 self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto pr-1">
          {navGroups.map((g) => (
            <div key={g.title} className="mb-4">
              <p className="px-2 mb-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-600">{g.title}</p>
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                {g.items.map((tab) => {
                  const Icon = tab.icon; const isActive = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => go(tab.id)} aria-current={isActive ? 'page' : undefined}
                      className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[13px] transition text-left whitespace-nowrap ${isActive ? 'bg-gold-500 text-imperial-950 font-semibold shadow' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}>
                      <span className="flex items-center gap-2.5"><Icon className="w-4 h-4" />{tab.label}</span>
                      <span className="flex items-center gap-1.5">
                        {tab.hot && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-label="Needs attention" />}
                        {tab.count !== undefined && tab.count > 0 && <span className={`px-1.5 rounded text-[10px] font-mono ${isActive ? 'bg-black/20' : 'bg-white/10 text-gold-300'}`}>{tab.count}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Main content */}
        <div className="lg:col-span-9 xl:col-span-10 min-w-0">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <Card variant="marble" className="p-6">
                <h3 className="font-serif font-bold text-lg text-white mb-1">Needs your attention</h3>
                {attention.length === 0 ? (
                  <p className="text-sm text-emerald-300 mt-2">✓ All clear. Nothing is waiting for you.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/5">
                    {attention.map((x) => (
                      <li key={x.label} className="flex items-center gap-3 py-2.5">
                        <span className={`w-2 h-2 rounded-full ${toneCls[x.tone]}`} />
                        <span className="flex-1 text-sm text-neutral-200">{x.label}</span>
                        <span className="text-sm font-mono text-white">{x.count}</span>
                        <button onClick={() => go(x.tab)} className="px-3 py-1 rounded-lg border border-gold-500/40 text-gold-300 text-xs hover:bg-gold-500/10">Open</button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { l: 'Repositories synced', v: githubRepos.length, c: 'text-white', s: '@helloAi0' },
                  { l: 'Skills cataloged', v: skills.length, c: 'text-emerald-300', s: 'with evidence tiers' },
                  { l: 'Certificates', v: certificates.length, c: 'text-gold-300', s: `${certificates.length - hiddenCerts} live` },
                  { l: 'Achievements', v: achievements.length, c: 'text-sky-300', s: `${achievements.length - hiddenAchs} live` },
                ].map((c) => (
                  <Card key={c.l} variant="marble" className="p-5">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">{c.l}</span>
                    <span className={`text-3xl font-serif font-black ${c.c}`}>{c.v}</span>
                    <span className="text-[10px] font-mono text-neutral-500 block mt-1">{c.s}</span>
                  </Card>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card variant="marble" className="p-6">
                  <h3 className="font-serif font-bold text-lg text-white mb-3">System status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {chip(health?.database?.status === 'CONNECTED', 'Database', 'Cannot reach the database.')}
                    {chip(!!health?.integrations?.githubSync, 'GitHub sync', 'Add GITHUB_TOKEN for higher limits.')}
                    {chip(!!health?.integrations?.geminiLlm, 'LAMO language model', 'Add GEMINI_API_KEY (LAMO still works without it).')}
                    {chip(!!health?.integrations?.emailNotifications, 'Email notifications', 'Add RESEND_API_KEY and EMAIL_FROM to get emails.')}
                  </div>
                </Card>
                <Card variant="marble" className="p-6">
                  <h3 className="font-serif font-bold text-lg text-white mb-3">Quick actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleTriggerGithubSync} disabled={loading} variant="primary" size="sm" icon={<Github className="w-3.5 h-3.5" />}>Sync GitHub now</Button>
                    <Button onClick={handleTriggerCodingSync} disabled={loading} variant="secondary" size="sm" icon={<Code2 className="w-3.5 h-3.5" />}>Sync LeetCode & GFG</Button>
                    <Button onClick={() => go('certificates')} variant="outline" size="sm">Add certificate</Button>
                    <Button onClick={() => go('achievements')} variant="outline" size="sm">Add achievement</Button>
                    <Button onClick={() => go('resume')} variant="outline" size="sm">Upload resume</Button>
                  </div>
                </Card>
              </div>

              <Card variant="marble" className="p-6">
                <h3 className="font-serif font-bold text-lg text-white mb-4">Recent sync activity</h3>
                <div className="space-y-2">
                  {syncLogs.length === 0 && <p className="text-xs text-neutral-500 font-mono">No sync has run yet.</p>}
                  {syncLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3 rounded bg-imperial-950 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant={log.status === 'SUCCESS' ? 'verified' : 'detected'} size="xs">{log.status}</Badge>
                        <span className="text-white font-bold">{log.integration?.platform || 'SYNC'}</span>
                        <span className="text-neutral-400">{log.trigger}</span>
                        {log.details && <span className="text-gold-300/80 truncate">• {log.details}</span>}
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0">{new Date(log.syncedAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">GitHub Ingestion Chamber</h3>
                  <p className="text-xs font-mono text-neutral-400">Discovered Repositories for @helloAi0</p>
                </div>
                <Button
                  onClick={handleTriggerGithubSync}
                  disabled={loading}
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                >
                  Discover & Re-Classify Repositories
                </Button>
              </div>

              {githubRepos.length === 0 ? (
                <Card variant="marble" className="p-10 text-center">
                  <p className="text-neutral-400 font-mono text-xs mb-4">No repositories ingested yet.</p>
                  <Button onClick={handleTriggerGithubSync} variant="primary" size="sm">
                    Commence First GitHub Discovery Sync
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {githubRepos.map((repo) => (
                    <Card key={repo.id} variant="marble" className="p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-serif font-bold text-lg text-white">{repo.name}</h4>
                            <Badge
                              variant={
                                repo.classificationStatus === 'APPROVED'
                                  ? 'verified'
                                  : repo.classificationStatus === 'REJECTED'
                                  ? 'danger'
                                  : 'gold'
                              }
                              size="xs"
                            >
                              {repo.classificationStatus}
                            </Badge>
                            <span className="text-[10px] font-mono text-neutral-400">
                              ★ {repo.stars} • ⑂ {repo.forks}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 font-sans">{repo.description || 'No description provided.'}</p>
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-mono text-gold-400 hover:underline mt-1"
                          >
                            <span>{repo.fullName}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Approval Controls */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {repo.classificationStatus !== 'APPROVED' && (
                            <button
                              onClick={() => handleApproveRepo(repo.id, 'APPROVE', repoDrafts[repo.id] ?? {})}
                              className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-900"
                            >
                              Approve &amp; Publish
                            </button>
                          )}
                          {repo.classificationStatus !== 'REJECTED' && (
                            <button
                              onClick={() => handleApproveRepo(repo.id, 'REJECT')}
                              className="px-2.5 py-1 rounded bg-red-950 border border-red-500/40 text-red-300 text-xs font-mono hover:bg-red-900"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Classification Engine Analysis */}
                      <div className="p-3.5 rounded bg-imperial-950 border border-gold-500/20 text-xs font-mono space-y-2">
                        <div className="flex items-center justify-between text-gold-300">
                          <span>
                            Suggested: <strong>{repo.suggestedCategorySlug || 'Uncategorized'}</strong> / {repo.suggestedSubcategory}
                          </span>
                          <span>Confidence: {Math.round((repo.classificationScore || 0) * 100)}%</span>
                        </div>
                        {repo.classificationNotes && (
                          <p className="text-[11px] text-neutral-400">{repo.classificationNotes}</p>
                        )}
                        {repo.suggestedDifficulty && (
                          <p className="text-[11px] text-neutral-400">
                            Suggested difficulty: <strong className="text-gold-300">{repo.suggestedDifficulty}</strong> (evidence-based, owner confirms)
                          </p>
                        )}
                        {repo.missingSince && (
                          <p className="text-[11px] text-red-300">No longer public on GitHub since {new Date(repo.missingSince).toLocaleDateString()}.</p>
                        )}
                        {repo.classificationStatus !== 'APPROVED' && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <select aria-label="Category" className="bg-imperial-900 border border-white/10 rounded px-2 py-1 text-[11px]"
                              value={repoDrafts[repo.id]?.categorySlug ?? repo.suggestedCategorySlug ?? ''}
                              onChange={(e) => setRepoDrafts((d) => ({ ...d, [repo.id]: { ...d[repo.id], categorySlug: e.target.value } }))}>
                              {TAXONOMY.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                            </select>
                            <select aria-label="Difficulty" className="bg-imperial-900 border border-white/10 rounded px-2 py-1 text-[11px]"
                              value={repoDrafts[repo.id]?.difficulty ?? ''}
                              onChange={(e) => setRepoDrafts((d) => ({ ...d, [repo.id]: { ...d[repo.id], difficulty: e.target.value || undefined } }))}>
                              <option value="">Use suggestion</option>
                              {DIFFICULTIES.map((x) => <option key={x} value={x}>{x}</option>)}
                            </select>
                          </div>
                        )}
                        {repo.readmeSummary && (
                          <div className="pt-1 text-[11px] text-neutral-300 border-t border-white/5">
                            <span className="text-neutral-500 uppercase text-[9px] block">README Excerpt:</span>
                            {repo.readmeSummary}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LEETCODE */}
          {activeTab === 'automation' && <AutomationPanel onChanged={loadAllData} />}
          {activeTab === 'profile' && <ProfileEditorPanel onChanged={loadAllData} />}
          {activeTab === 'inbox' && <EnquiriesPanel onChanged={loadAllData} />}
          {activeTab === 'visitor-chats' && <VisitorChatsPanel />}
          {activeTab === 'job-agent' && <JobAgentPanel />}
          {activeTab === 'outreach' && <OutreachPanel />}
          {activeTab === 'manual' && <ManualEntryPanel onChanged={loadAllData} />}
          {activeTab === 'projects' && <ProjectsStudioPanel onChanged={loadAllData} />}
          {activeTab === 'resume' && <ResumeStudioPanel onChanged={loadAllData} />}

          {activeTab === 'leetcode' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">LeetCode Platform Adapter</h3>
                  <p className="text-xs font-mono text-neutral-400">Verifiable Competitive Statistics</p>
                </div>
                <Button onClick={handleTriggerCodingSync} disabled={loading} variant="primary" size="sm">
                  Run Live GraphQL Sync
                </Button>
              </div>

              <Card variant="marble" className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-400">Configured Username:</span>
                  <span className="text-white font-mono font-bold">{codingStats.leetcode?.username || 'Not configured'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-400">Data Source Mode:</span>
                  <Badge variant={codingStats.leetcode?.dataSource === 'LIVE' ? 'verified' : 'detected'} size="xs">
                    {codingStats.leetcode?.dataSource || 'UNAVAILABLE'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-400">Total Solved:</span>
                  <span className="text-white font-bold">{codingStats.leetcode?.totalSolved ?? 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded bg-imperial-900 text-center">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">Easy</span>
                    <p className="text-lg font-bold text-white">{codingStats.leetcode?.easySolved ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded bg-imperial-900 text-center">
                    <span className="text-[10px] font-mono text-amber-400 uppercase">Medium</span>
                    <p className="text-lg font-bold text-white">{codingStats.leetcode?.mediumSolved ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded bg-imperial-900 text-center">
                    <span className="text-[10px] font-mono text-red-400 uppercase">Hard</span>
                    <p className="text-lg font-bold text-white">{codingStats.leetcode?.hardSolved ?? '—'}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: GEEKSFORGEEKS */}
          {activeTab === 'geeksforgeeks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">GeeksforGeeks Adapter</h3>
                  <p className="text-xs font-mono text-neutral-400">Practice Problem Telemetry</p>
                </div>
                <Button onClick={handleTriggerCodingSync} disabled={loading} variant="primary" size="sm">
                  Run GFG Proxy Sync
                </Button>
              </div>

              <Card variant="marble" className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-400">Total Solved:</span>
                  <span className="text-white font-bold">{codingStats.gfg?.totalSolved ?? 'N/A'}</span>
                </div>
                <div className="p-3 rounded bg-imperial-900 border border-amber-500/20 text-xs font-mono text-amber-300/80">
                  Notice: GeeksforGeeks does not provide an official public API. Data is maintained through verified benchmarks.
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: SKILLS GRAPH ENGINE */}
          {activeTab === 'skills' && <SkillsPanel onChanged={loadAllData} />}

          {/* TAB 7: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Administrative Certificate Vault</h3>
              <CertificateQueuePanel onChanged={() => loadAllData()} />

              {/* Add Certificate Form */}
              <Card variant="marble" className="p-6">
                <h4 className="font-serif font-bold text-base text-white mb-3">Record Verified Credential</h4>
                <form onSubmit={handleAddCert} className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 block mb-1">Certificate Title *</label>
                      <input
                        type="text"
                        required
                        value={newCert.title}
                        onChange={(e) => setNewCert({ ...newCert, title: e.target.value })}
                        placeholder="e.g. Deep Learning Specialization"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Issuing Authority *</label>
                      <input
                        type="text"
                        required
                        value={newCert.issuingOrganization}
                        onChange={(e) => setNewCert({ ...newCert, issuingOrganization: e.target.value })}
                        placeholder="e.g. DeepLearning.AI / Coursera"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 block mb-1">Credential ID</label>
                      <input
                        type="text"
                        value={newCert.credentialId}
                        onChange={(e) => setNewCert({ ...newCert, credentialId: e.target.value })}
                        placeholder="e.g. DLAI-984210"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Verification URL</label>
                      <input
                        type="url"
                        value={newCert.credentialUrl}
                        onChange={(e) => setNewCert({ ...newCert, credentialUrl: e.target.value })}
                        placeholder="https://coursera.org/verify/..."
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Description & Topics Covered</label>
                    <textarea
                      rows={2}
                      value={newCert.description}
                      onChange={(e) => setNewCert({ ...newCert, description: e.target.value })}
                      placeholder="Neural networks, CNNs, Transformers..."
                      className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Certificate file (PDF, PNG, JPG, GIF or WEBP, up to 8 MB, optional)</label>
                    <input
                      key={certFile ? 'has-file' : 'no-file'}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg"
                      onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
                      className="text-xs text-neutral-300"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Save Credential
                  </Button>
                </form>
              </Card>

              {/* Existing Certificates */}
              <div className="space-y-3">
                {certificates.length === 0 && <p className="text-xs text-neutral-500 font-mono">No certificates yet. Add one above and it will appear in the Certificates hall.</p>}
                {certificates.map((cert) => (
                  <RecordRow key={cert.id} title={cert.title} subtitle={cert.issuingOrganization} approved={!!cert.ownerApproved} isPublic={!!cert.isPublic} fileUrl={cert.filePath} busy={recordBusy}
                    onToggle={(pub) => handleRecordToggle('certificates', cert.id, pub)} onDelete={() => handleRecordDelete('certificates', cert.id, cert.title)} />
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Achievements & Honors Registry</h3>

              <Card variant="marble" className="p-6">
                <h4 className="font-serif font-bold text-base text-white mb-3">Record Verified Honor</h4>
                <form onSubmit={handleAddAchievement} className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 block mb-1">Honor Title *</label>
                      <input
                        type="text"
                        required
                        value={newAch.title}
                        onChange={(e) => setNewAch({ ...newAch, title: e.target.value })}
                        placeholder="e.g. Autonomous Rover Challenge Finalist"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Organization *</label>
                      <input
                        type="text"
                        required
                        value={newAch.organization}
                        onChange={(e) => setNewAch({ ...newAch, organization: e.target.value })}
                        placeholder="e.g. Robotics & Automation Society"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Record Honor
                  </Button>
                </form>
              </Card>

              <div className="space-y-3">
                {achievements.length === 0 && <p className="text-xs text-neutral-500 font-mono">No achievements yet. Add one above and it will rise into the Heaven sky.</p>}
                {achievements.map((item) => (
                  <RecordRow key={item.id} title={item.title} subtitle={`${item.organization}${item.rankOrAward ? ' · ' + item.rankOrAward : ''}`} approved={!!item.ownerApproved} isPublic={!!item.isPublic} fileUrl={item.proofUrl} busy={recordBusy}
                    onToggle={(pub) => handleRecordToggle('achievements', item.id, pub)} onDelete={() => handleRecordDelete('achievements', item.id, item.title)} />
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: EXPERIENCE */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Experience & Laboratory Appointments</h3>

              <Card variant="marble" className="p-6">
                <h4 className="font-serif font-bold text-base text-white mb-3">Record Verified Engagement</h4>
                <form onSubmit={handleAddExperience} className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-neutral-400 block mb-1">Role Title *</label>
                      <input
                        type="text"
                        required
                        value={newExp.roleTitle}
                        onChange={(e) => setNewExp({ ...newExp, roleTitle: e.target.value })}
                        placeholder="e.g. Job or internship title"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-neutral-400 block mb-1">Organization *</label>
                      <input
                        type="text"
                        required
                        value={newExp.organization}
                        onChange={(e) => setNewExp({ ...newExp, organization: e.target.value })}
                        placeholder="e.g. Organization name"
                        className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1">Description *</label>
                    <textarea
                      required
                      rows={2}
                      value={newExp.description}
                      onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                      placeholder="What you actually did in this role"
                      className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Save Appointment
                  </Button>
                </form>
              </Card>

              <div className="space-y-3">
                {experiences.map((exp) => (
                  <Card key={exp.id} variant="marble" className="p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">{exp.roleTitle}</h4>
                      <p className="text-xs text-gold-300 font-mono">{exp.organization}</p>
                    </div>
                    <Badge variant={exp.verified ? 'verified' : 'detected'} size="xs">
                      {exp.verified ? 'VERIFIED' : 'DRAFT'}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LAMO QUESTION INBOX */}
          {activeTab === 'lamo-questions' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-serif font-bold text-xl text-white">LAMO Question Inbox & Knowledge Approval</h3>
                  <p className="text-xs font-mono text-neutral-400 mt-0.5">
                    Queries where verified evidence was absent. Approvals create permanent owner-confirmed AI knowledge records.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {lamoQuestions.filter((q) => q.status === 'PENDING_OWNER').length} Pending Review
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {lamoQuestions.filter((q) => q.status === 'ANSWERED').length} Answered
                  </span>
                </div>
              </div>

              {lamoQuestions.length === 0 ? (
                <Card variant="marble" className="p-8 text-center text-xs font-mono text-neutral-400">
                  No unanswered visitor questions recorded yet. When a visitor asks about unknown skills or experiences, it will appear here.
                </Card>
              ) : (
                <div className="space-y-4">
                  {lamoQuestions.map((q) => (
                    <Card key={q.id} variant="marble" className="p-5 space-y-3 font-mono text-xs">
                      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-gold-500/20">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 font-bold">
                            {q.questionId}
                          </span>
                          <span className="text-neutral-400">Category: <strong className="text-white">{q.category}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.status === 'PENDING_OWNER'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : q.status === 'ANSWERED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : q.status === 'PRIVATE_DECLINED'
                                ? 'bg-neutral-800 text-neutral-300'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {q.status}
                          </span>
                          <span className="text-neutral-500 text-[10px]">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Visitor Query:</span>
                        <blockquote className="text-sm font-sans font-semibold text-white pl-3 border-l-2 border-gold-500">
                          &ldquo;{q.question}&rdquo;
                        </blockquote>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-imperial-950/40 p-2.5 rounded">
                        <div>
                          <span className="text-neutral-500">Reason for Missing Evidence:</span>
                          <div className="text-amber-300/90">{q.reason}</div>
                        </div>
                        <div>
                          <span className="text-neutral-500">Visitor Contact:</span>
                          <div className="text-neutral-200">
                            {q.visitorEmail ? (
                              <span>
                                {q.visitorName || 'Visitor'} &lt;{q.visitorEmail}&gt;
                              </span>
                            ) : (
                              <span className="text-neutral-500 italic">Anonymous (No email left)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {q.ownerAnswer && (
                        <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded space-y-1">
                          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                            Owner Approved Answer:
                          </span>
                          <p className="text-white text-xs font-sans whitespace-pre-wrap">{q.ownerAnswer}</p>
                          <span className="text-[10px] text-emerald-400 block mt-1">
                            {q.answerVisibility === 'PUBLIC' ? '✓ Public: LAMO may reuse this answer' : '🔒 Private: not used by LAMO'}
                          </span>
                        </div>
                      )}

                      {/* Action Controls for Pending Questions */}
                      {(q.status === 'PENDING_OWNER' || q.status === 'NEEDS_CONTEXT') && (
                        <div className="pt-2">
                          {answeringQId === q.id ? (
                            <div className="space-y-3 bg-imperial-900/60 p-4 rounded-lg border border-gold-500/30">
                              <label className="text-[11px] text-gold-300 font-bold block">
                                Provide your answer:
                              </label>
                              <textarea
                                value={ownerAnswerInput}
                                onChange={(e) => setOwnerAnswerInput(e.target.value)}
                                rows={3}
                                placeholder="Write the answer. It becomes public only if you tick the box below."
                                className="w-full bg-imperial-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
                              />

                              <label className="flex items-center space-x-2 text-[11px] text-neutral-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={answerVisibility === 'PUBLIC'}
                                  onChange={(e) => setAnswerVisibility(e.target.checked ? 'PUBLIC' : 'PRIVATE')}
                                  className="rounded border-neutral-700 bg-imperial-950 text-gold-500 focus:ring-0"
                                />
                                <span>Let LAMO reuse this answer publicly for other visitors (off = only for this visitor)</span>
                              </label>

                              {q.visitorEmail && (
                                <label className="flex items-center space-x-2 text-[11px] text-neutral-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={notifyVisitorOnApprove}
                                    onChange={(e) => setNotifyVisitorOnApprove(e.target.checked)}
                                    className="rounded border-neutral-700 bg-imperial-950 text-gold-500 focus:ring-0"
                                  />
                                  <span>Send email notification to visitor ({q.visitorEmail})</span>
                                </label>
                              )}

                              <div className="flex items-center space-x-2">
                                <Button
                                  onClick={() => handleApproveQuestion(q.id)}
                                  size="sm"
                                  variant="primary"
                                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                >
                                  Save answer
                                </Button>
                                <Button
                                  onClick={() => {
                                    setAnsweringQId(null);
                                    setOwnerAnswerInput('');
                                  }}
                                  size="sm"
                                  variant="secondary"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                onClick={() => {
                                  setAnsweringQId(q.id);
                                  setOwnerAnswerInput('');
                                }}
                                size="sm"
                                variant="primary"
                              >
                                Answer & Approve
                              </Button>
                              <input
                                value={contextRequestInput}
                                onChange={(e) => setContextRequestInput(e.target.value)}
                                placeholder="Need more context from the visitor?"
                                className="bg-imperial-950 border border-neutral-700 rounded px-2 py-1 text-xs text-white w-56"
                              />
                              <Button onClick={() => handleRequestContext(q.id)} size="sm" variant="secondary">
                                Ask for context
                              </Button>
                              <Button
                                onClick={() => handleMarkPrivateQuestion(q.id)}
                                size="sm"
                                variant="secondary"
                              >
                                Mark Private / Decline
                              </Button>
                              <Button
                                onClick={() => handleRejectQuestion(q.id)}
                                size="sm"
                                variant="outline"
                              >
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleDeleteQuestion(q.id)}
                                size="sm"
                                variant="outline"
                                icon={<Trash2 className="w-3 h-3 text-red-400" />}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: LAMO COPILOT & BIOGRAPHY MANAGER */}
          {activeTab === 'lamo-copilot' && (
            <div className="space-y-8 font-mono text-xs">
              <div>
                <h3 className="font-serif font-bold text-xl text-white">LAMO Admin Copilot & Autonomous Biography Review</h3>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  Autonomous identity management, portfolio completeness auditing, skill extraction, and 60-90 day milestone reviews.
                </p>
              </div>

              {/* SECTION 1: 60-90 DAY INTELLIGENT BIOGRAPHY REVIEW */}
              <Card variant="marble" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gold-500/20">
                  <div>
                    <h4 className="font-serif font-bold text-base text-gold-300">
                      Intelligent Biography Management (60-90 Day Cycle)
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Reviews portfolio achievements and generates an evidence-backed proposed biography.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleGenerateBioReview(true)}
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                  >
                    Generate Milestone Review
                  </Button>
                </div>

                {bioReview ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-[11px]">
                      <span className="text-neutral-400">Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        bioReview.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {bioReview.status}
                      </span>
                      <span className="text-neutral-500">
                        Review Date: {new Date(bioReview.reviewDate).toLocaleDateString()}
                      </span>
                      <span className="text-neutral-500">
                        ({bioReview.daysSinceLastReview} days since last cycle)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current Bio */}
                      <div className="bg-imperial-950/60 p-4 rounded-lg border border-neutral-800 space-y-2">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                          Current Live Biography:
                        </span>
                        <p className="font-sans text-neutral-300 text-xs leading-relaxed">
                          {bioReview.currentBio}
                        </p>
                      </div>

                      {/* Proposed Bio */}
                      <div className="bg-imperial-950/60 p-4 rounded-lg border border-gold-500/40 space-y-2 shadow-lg">
                        <span className="text-[10px] text-gold-400 uppercase tracking-wider block font-bold">
                          Proposed Updated Biography (Evidence-Grounded):
                        </span>
                        <p className="font-sans text-white text-xs leading-relaxed">
                          {bioReview.proposedBio}
                        </p>
                      </div>
                    </div>

                    {/* Detected Milestones */}
                    {bioReview.reasons && (
                      <div className="space-y-2">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                          Detected Milestones & Reasons for Update:
                        </span>
                        <ul className="space-y-1 list-disc list-inside text-neutral-300 text-[11px]">
                          {(Array.isArray(bioReview.reasons) ? bioReview.reasons : JSON.parse(bioReview.reasons || '[]')).map((r: string, idx: number) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {bioReview.status === 'PENDING_APPROVAL' && (
                      <div className="pt-2 border-t border-neutral-800 space-y-3">
                        <input
                          type="text"
                          placeholder="Optional feedback / confirmation note..."
                          value={bioFeedback}
                          onChange={(e) => setBioFeedback(e.target.value)}
                          className="w-full bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white"
                        />
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleApproveBioReview(bioReview.reviewId || bioReview.id)}
                            variant="primary"
                            size="sm"
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Approve & Update Portfolio Bio
                          </Button>
                          <Button
                            onClick={() => handleDeclineBioReview(bioReview.reviewId || bioReview.id)}
                            variant="secondary"
                            size="sm"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-neutral-500 italic">Click &apos;Generate Milestone Review&apos; to run autonomous evaluation.</p>
                )}
              </Card>

              {/* SECTION 2: PORTFOLIO COMPLETENESS AUDIT */}
              <Card variant="marble" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gold-500/20">
                  <div>
                    <h4 className="font-serif font-bold text-base text-gold-300">
                      Portfolio Completeness & RAG Grounding Audit
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Analyzes information gaps across Profile, Projects, Skills, Certificates, and Coding Arena.
                    </p>
                  </div>
                  <Button
                    onClick={handleRunAudit}
                    variant="primary"
                    size="sm"
                    icon={<Cpu className="w-3.5 h-3.5" />}
                  >
                    Run Completeness Audit
                  </Button>
                </div>

                {auditResult && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl font-serif font-bold text-gold-400">
                        {auditResult.score}%
                      </div>
                      <div>
                        <div className="text-xs text-white font-bold">Completeness Index</div>
                        <div className="text-[10px] text-neutral-400">
                          {auditResult.completedChecks} of {auditResult.totalChecks} standards met
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {auditResult.items.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded bg-imperial-950/60 border border-neutral-800 flex justify-between items-start"
                        >
                          <div>
                            <div className="text-[10px] text-neutral-500 uppercase">{item.domain} • {item.field}</div>
                            <div className="text-neutral-300 text-[11px] mt-0.5">{item.detail}</div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ml-2 ${
                              item.status === 'COMPLETE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : item.status === 'ATTENTION_NEEDED'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    {auditResult.recommendations.length > 0 && (
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">
                          Actionable Recommendations:
                        </span>
                        <ul className="list-disc list-inside text-neutral-300 text-[11px] space-y-0.5">
                          {auditResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* SECTION 3: REPOSITORY SKILL AUTO-DISCOVERY */}
              <Card variant="marble" className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gold-500/20">
                  <div>
                    <h4 className="font-serif font-bold text-base text-gold-300">
                      Skill Auto-Discovery from Repositories
                    </h4>
                    <p className="text-[11px] text-neutral-400">
                      Scans codebase metadata, languages, and project stacks to propose verified skill additions.
                    </p>
                  </div>
                  <Button
                    onClick={handleSuggestSkills}
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                  >
                    Scan Repositories for Skills
                  </Button>
                </div>

                {suggestedSkillsList.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {suggestedSkillsList.map((skill: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-imperial-950/60 rounded border border-neutral-800 space-y-1.5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-xs">{skill.name}</span>
                          <span className="text-[10px] text-gold-400 font-bold">used in {skill.evidenceProjectCount} approved project(s)</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">Category: {skill.category}</div>
                        <div className="text-[10px] text-neutral-500">
                          Found in: {skill.derivedFromProjects.join(', ')}
                        </div>
                        <div className="pt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            skill.isVerified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            {skill.isVerified ? 'Verified in DB' : 'Discovered in Stack'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* SECTION 4: PROJECT ELEVATION & DESCRIPTION ENHANCEMENT */}
              <Card variant="marble" className="p-6 space-y-4">
                <div className="pb-3 border-b border-gold-500/20">
                  <h4 className="font-serif font-bold text-base text-gold-300">
                    Project Description Enhancement (Imperial Standards)
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Elevates technical documentation into high-rigor, verified engineering descriptions with audit rollback.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedProjectIdForEnhance}
                    onChange={(e) => setSelectedProjectIdForEnhance(e.target.value)}
                    className="flex-1 bg-imperial-950 border border-neutral-700 rounded p-2 text-xs text-white"
                  >
                    <option value="">Select an engineering project...</option>
                    {githubRepos.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.name} ({repo.inferredCategory || 'Repository'})
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleDraftEnhancement}
                    variant="primary"
                    size="sm"
                    disabled={!selectedProjectIdForEnhance}
                  >
                    Draft Enhancement
                  </Button>
                </div>

                {enhancementDraft && (
                  <div className="space-y-4 p-4 bg-imperial-950/80 border border-gold-500/40 rounded-lg">
                    <div className="font-bold text-gold-300 text-xs">
                      Elevation Preview: {enhancementDraft.title}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-neutral-500 block mb-1 uppercase">Current Description:</span>
                        <p className="text-neutral-400 text-xs bg-imperial-900/50 p-3 rounded">
                          {enhancementDraft.currentDescription || 'No description set'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gold-400 block mb-1 uppercase font-bold">Proposed Description:</span>
                        <p className="text-white text-xs bg-imperial-900/80 p-3 rounded border border-gold-500/30">
                          {enhancementDraft.proposedDescription}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-400">
                      <strong>Reason for enhancement:</strong> {enhancementDraft.changeExplanation}
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        onClick={handleApplyEnhancement}
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Apply Enhancement (Audit Logged)
                      </Button>
                      <Button
                        onClick={() => setEnhancementDraft(null)}
                        variant="secondary"
                        size="sm"
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* SECTION 5: AUDIT LOGS & ONE-CLICK ROLLBACK */}
              <Card variant="marble" className="p-6 space-y-4">
                <div className="pb-3 border-b border-gold-500/20">
                  <h4 className="font-serif font-bold text-base text-gold-300">
                    Copilot Audit Trail & One-Click Rollback Engine
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Complete state snapshots preserved for all automated and owner-approved actions.
                  </p>
                </div>

                {recentAuditLogs.length === 0 ? (
                  <p className="text-neutral-500 italic">No audit records logged yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentAuditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-3 bg-imperial-950/60 rounded border border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-[11px]">{log.action}</span>
                            <span className="text-gold-400 text-[10px]">{log.target}</span>
                            <span className="text-neutral-500 text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          {log.explanation && (
                            <p className="text-neutral-400 text-[11px]">{log.explanation}</p>
                          )}
                        </div>

                        {log.previousState && !log.action.startsWith('ROLLBACK_') && (
                          <Button
                            onClick={() => handleRollback(log.id)}
                            variant="outline"
                            size="sm"
                            className="text-[10px] shrink-0"
                          >
                            Rollback
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 10: SYNC HISTORY */}
          {activeTab === 'sync-history' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Full Synchronization Audit Trail</h3>
              <div className="space-y-2">
                {syncLogs.map((log) => (
                  <Card key={log.id} variant="marble" className="p-4 text-xs font-mono space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Badge variant={log.status === 'SUCCESS' ? 'verified' : 'detected'} size="xs">
                          {log.status}
                        </Badge>
                        <span className="text-white font-bold">{log.integration?.platform}</span>
                        <span className="text-neutral-400">Trigger: {log.trigger}</span>
                      </div>
                      <span className="text-neutral-500">{new Date(log.syncedAt).toLocaleString()}</span>
                    </div>
                    {log.details && <p className="text-neutral-300">{log.details}</p>}
                    {log.errorMessage && <p className="text-red-400">{log.errorMessage}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Integration Settings & Webhook Keys</h3>
              <Card variant="marble" className="p-6 space-y-4 text-xs font-mono">
                <div>
                  <span className="text-neutral-400 uppercase text-[10px] block">Primary GitHub Profile</span>
                  <span className="text-white font-bold">https://github.com/helloAi0</span>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase text-[10px] block">Webhook Target Endpoint</span>
                  <code className="text-gold-300">https://[your-domain]/api/webhooks/github</code>
                </div>
                <div>
                  <span className="text-neutral-400 uppercase text-[10px] block">Reconciliation Cron Endpoint</span>
                  <code className="text-gold-300">POST /api/sync/reconcile (Bearer CRON_SECRET)</code>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

