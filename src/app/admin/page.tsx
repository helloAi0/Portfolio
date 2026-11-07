'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
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
  EyeOff,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'github'
  | 'leetcode'
  | 'geeksforgeeks'
  | 'linkedin'
  | 'projects'
  | 'skills'
  | 'certificates'
  | 'achievements'
  | 'experience'
  | 'lamo-questions'
  | 'lamo-copilot'
  | 'sync-history'
  | 'settings';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
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
    setTimeout(() => setMessage(null), 5000);
  };

  // Initial data loading
  useEffect(() => {
    loadAllData();
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

      const ghData = await ghRes.json();
      const csData = await csRes.json();
      const liData = await liRes.json();
      const skData = await skRes.json();
      const certData = await certRes.json();
      const achData = await achRes.json();
      const expData = await expRes.json();
      const logData = await logRes.json();
      const intData = await intRes.json();
      const lamoQData = lamoQRes.ok ? await lamoQRes.json() : { data: [] };
      const bioData = bioRes.ok ? await bioRes.json() : { data: null };
      const copilotData = copilotRes.ok ? await copilotRes.json() : { data: [] };

      setGithubRepos(ghData.data || []);
      setCodingStats(csData || { leetcode: null, gfg: null });
      setLinkedinPosts(liData.data || []);
      setSkills(skData.data || []);
      setCertificates(certData.data || []);
      setAchievements(achData.data || []);
      setExperiences(expData.data || []);
      setSyncLogs(logData.data || []);
      setIntegrations(intData.data || []);
      setLamoQuestions(lamoQData.data || []);
      if (bioData.data) setBioReview(bioData.data);
      if (copilotData.data) setRecentAuditLogs(copilotData.data);
    } catch (err) {
      showMsg('error', 'Failed to load citadel dashboard data.');
    } finally {
      setLoading(false);
    }
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

  const handleApproveRepo = async (id: string, action: 'APPROVE' | 'REJECT' | 'SKIP') => {
    try {
      const res = await fetch(`/api/admin/github/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        showMsg('success', `Repository classification ${action.toLowerCase()}d.`);
        loadAllData();
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
      }
    } catch {
      showMsg('error', 'Failed to update skill.');
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
      if (res.ok) {
        showMsg('success', 'LinkedIn post imported.');
        setNewPost({ title: '', contentExcerpt: '', postUrl: '', isPublic: true, isApproved: true });
        loadAllData();
      }
    } catch {
      showMsg('error', 'Failed to import post.');
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCert),
      });
      if (res.ok) {
        showMsg('success', 'Certificate recorded.');
        setNewCert({ title: '', issuingOrganization: '', issueDate: '', credentialId: '', credentialUrl: '', description: '', isPublic: true, ownerApproved: true });
        loadAllData();
      }
    } catch {
      showMsg('error', 'Failed to create certificate.');
    }
  };

  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
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
      }
    } catch {
      showMsg('error', 'Failed to create achievement.');
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
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
      }
    } catch {
      showMsg('error', 'Failed to create experience.');
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
        }),
      });
      if (res.ok) {
        showMsg('success', 'Question approved and converted to permanent AI knowledge record.');
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

  const navTabs: { id: AdminTab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Citadel Overview', icon: LayoutDashboard },
    { id: 'github', label: 'GitHub Repositories', icon: Github, count: githubRepos.length },
    { id: 'leetcode', label: 'LeetCode', icon: Code2 },
    { id: 'geeksforgeeks', label: 'GeeksforGeeks', icon: Code2 },
    { id: 'linkedin', label: 'LinkedIn Transmissions', icon: Linkedin, count: linkedinPosts.length },
    { id: 'skills', label: 'Skill Graph Engine', icon: Cpu, count: skills.length },
    { id: 'certificates', label: 'Certificates Vault', icon: Award, count: certificates.length },
    { id: 'achievements', label: 'Achievements & Honors', icon: Trophy, count: achievements.length },
    { id: 'experience', label: 'Experience & Labs', icon: Briefcase, count: experiences.length },
    { id: 'lamo-questions', label: 'LAMO Question Inbox', icon: Send, count: lamoQuestions.filter((q) => q.status === 'PENDING_OWNER').length },
    { id: 'lamo-copilot', label: 'LAMO Copilot & Bio', icon: Cpu },
    { id: 'sync-history', label: 'Synchronization Logs', icon: History, count: syncLogs.length },
    { id: 'settings', label: 'Integration Settings', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gold-500/20 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-serif font-black text-2xl text-white">CITADEL COMMAND DESK</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/40">
              Week 2 Intelligence Engine
            </span>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Data Discovery • Project Classification • Evidence Graph • Platform Sync
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={loadAllData}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Telemetry
          </Button>
          <Button onClick={handleLogout} variant="secondary" size="sm" icon={<LogOut className="w-3.5 h-3.5" />}>
            Log Out
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-4 rounded-md mb-6 text-xs font-mono flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/80 border border-red-500/40 text-red-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Dashboard Layout: Left Nav + Right Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-mono uppercase tracking-wider transition-all text-left ${
                  isActive
                    ? 'bg-gold-500 text-imperial-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-imperial-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      isActive ? 'bg-imperial-950/30 text-imperial-950' : 'bg-imperial-800 text-gold-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Chamber */}
        <div className="lg:col-span-9">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card variant="marble" className="p-5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Synced Repos</span>
                  <span className="text-3xl font-serif font-black text-white">{githubRepos.length}</span>
                  <span className="text-[10px] font-mono text-gold-400 block mt-1">@helloAi0</span>
                </Card>

                <Card variant="marble" className="p-5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Pending Review</span>
                  <span className="text-3xl font-serif font-black text-amber-300">
                    {githubRepos.filter((r) => r.classificationStatus === 'SUGGESTED').length}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 block mt-1">Awaiting Approval</span>
                </Card>

                <Card variant="marble" className="p-5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Cataloged Skills</span>
                  <span className="text-3xl font-serif font-black text-emerald-300">{skills.length}</span>
                  <span className="text-[10px] font-mono text-neutral-500 block mt-1">5 Evidence Tiers</span>
                </Card>

                <Card variant="marble" className="p-5">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block mb-1">Sync Log Records</span>
                  <span className="text-3xl font-serif font-black text-gold-300">{syncLogs.length}</span>
                  <span className="text-[10px] font-mono text-neutral-500 block mt-1">Audit Trail Active</span>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card variant="marble" className="p-6">
                <h3 className="font-serif font-bold text-lg text-white mb-4">Immediate Synchronization Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleTriggerGithubSync}
                    disabled={loading}
                    variant="primary"
                    size="sm"
                    icon={<Github className="w-3.5 h-3.5" />}
                  >
                    Trigger GitHub Discovery Sync
                  </Button>
                  <Button
                    onClick={handleTriggerCodingSync}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                    icon={<Code2 className="w-3.5 h-3.5" />}
                  >
                    Sync LeetCode & GFG Stats
                  </Button>
                </div>
              </Card>

              {/* Recent Sync Audit Stream */}
              <Card variant="marble" className="p-6">
                <h3 className="font-serif font-bold text-lg text-white mb-4">Recent Audit Ingestion Stream</h3>
                <div className="space-y-2">
                  {syncLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded bg-imperial-950 border border-white/5 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center space-x-2">
                        <Badge variant={log.status === 'SUCCESS' ? 'verified' : 'detected'} size="xs">
                          {log.status}
                        </Badge>
                        <span className="text-white font-bold">{log.integration?.platform || 'SYNC'}</span>
                        <span className="text-neutral-400">Trigger: {log.trigger}</span>
                        {log.details && <span className="text-gold-300/80">• {log.details}</span>}
                      </div>
                      <span className="text-[10px] text-neutral-500">{new Date(log.syncedAt).toLocaleTimeString()}</span>
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
                              onClick={() => handleApproveRepo(repo.id, 'APPROVE')}
                              className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-900"
                            >
                              Approve
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
                  <span className="text-white font-mono font-bold">{codingStats.leetcode?.username || 'helloAi0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-400">Data Source Mode:</span>
                  <Badge variant={codingStats.leetcode?.dataSource === 'LIVE' ? 'verified' : 'detected'} size="xs">
                    {codingStats.leetcode?.dataSource || 'MOCK'}
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

          {/* TAB 5: LINKEDIN */}
          {activeTab === 'linkedin' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">LinkedIn Transmission Feed & Manual Importer</h3>

              {/* Add Post Form */}
              <Card variant="marble" className="p-6">
                <h4 className="font-serif font-bold text-base text-white mb-3">Import Verified Transmission</h4>
                <form onSubmit={handleAddPost} className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-neutral-400 block mb-1">Post Title (Optional)</label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      placeholder="e.g. Autonomous SLAM Trajectory Update"
                      className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">Post Content Excerpt *</label>
                    <textarea
                      required
                      rows={3}
                      value={newPost.contentExcerpt}
                      onChange={(e) => setNewPost({ ...newPost, contentExcerpt: e.target.value })}
                      placeholder="Paste text of transmission..."
                      className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 block mb-1">LinkedIn Post URL</label>
                    <input
                      type="url"
                      value={newPost.postUrl}
                      onChange={(e) => setNewPost({ ...newPost, postUrl: e.target.value })}
                      placeholder="https://linkedin.com/feed/update/urn:li:activity:..."
                      className="w-full px-3 py-2 rounded bg-imperial-900 border border-gold-500/20 text-white"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Save Transmission Update
                  </Button>
                </form>
              </Card>

              {/* Existing Posts */}
              <div className="space-y-3">
                {linkedinPosts.map((post) => (
                  <Card key={post.id} variant="marble" className="p-4 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{post.title || 'Professional Update'}</h4>
                      <p className="text-xs text-neutral-300 mt-1">{post.contentExcerpt}</p>
                      <span className="text-[10px] font-mono text-neutral-500 block mt-2">
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={post.isApproved ? 'verified' : 'detected'} size="xs">
                      {post.isApproved ? 'Approved Public' : 'Draft'}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: SKILLS GRAPH ENGINE */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Dynamic Skill Graph & Evidence Hierarchy</h3>
              <div className="space-y-3">
                {skills.map((skill) => (
                  <Card key={skill.id} variant="marble" className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-base">{skill.name}</span>
                        <Badge variant={skill.verified ? 'verified' : 'detected'} size="xs">
                          {skill.verified ? 'VERIFIED' : 'DETECTED'}
                        </Badge>
                        <span className="text-xs font-mono text-gold-400">Level: {skill.level}</span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono mt-1">
                        Domain: {skill.domain} • Category: {skill.category}
                      </p>
                    </div>

                    {/* Change Tier Controls */}
                    <div className="flex items-center space-x-2">
                      <select
                        value={skill.level}
                        onChange={(e) => handleUpdateSkill(skill.id, { level: e.target.value })}
                        className="px-2.5 py-1 rounded bg-imperial-900 border border-gold-500/20 text-xs font-mono text-gold-300"
                      >
                        <option value="DEMONSTRATED">Demonstrated in Projects</option>
                        <option value="OWNER_CONFIRMED">Owner Confirmed</option>
                        <option value="PRACTICING">Practicing</option>
                        <option value="LEARNING">Active Learning</option>
                        <option value="DETECTED">Detected Baseline</option>
                      </select>

                      <button
                        onClick={() => handleUpdateSkill(skill.id, { verified: !skill.verified })}
                        className={`px-3 py-1 rounded text-xs font-mono ${
                          skill.verified
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                            : 'bg-imperial-800 text-neutral-300'
                        }`}
                      >
                        {skill.verified ? 'Verified ✓' : 'Mark Verified'}
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <h3 className="font-serif font-bold text-xl text-white">Administrative Certificate Vault</h3>

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

                  <Button type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                    Save Credential
                  </Button>
                </form>
              </Card>

              {/* Existing Certificates */}
              <div className="space-y-3">
                {certificates.map((cert) => (
                  <Card key={cert.id} variant="marble" className="p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">{cert.title}</h4>
                      <p className="text-xs text-gold-300 font-mono">{cert.issuingOrganization}</p>
                    </div>
                    <Badge variant={cert.ownerApproved ? 'verified' : 'detected'} size="xs">
                      {cert.verificationStatus}
                    </Badge>
                  </Card>
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
                {achievements.map((item) => (
                  <Card key={item.id} variant="marble" className="p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white text-sm">{item.title}</h4>
                      <p className="text-xs text-neutral-400 font-mono">{item.organization}</p>
                    </div>
                    <Badge variant={item.ownerApproved ? 'verified' : 'detected'} size="xs">
                      {item.verificationStatus}
                    </Badge>
                  </Card>
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
                        placeholder="e.g. Autonomous Robotics Lab Researcher"
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
                        placeholder="e.g. UEM Robotics Computing Society"
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
                      placeholder="Conducted experiments on ROS 2 Humble nodes..."
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
                          {q.approvedKnowledgeId && (
                            <span className="text-[10px] text-emerald-400 block mt-1">
                              ✓ Converted to permanent AI Knowledge Record ({q.approvedKnowledgeId})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Controls for Pending Questions */}
                      {q.status === 'PENDING_OWNER' && (
                        <div className="pt-2">
                          {answeringQId === q.id ? (
                            <div className="space-y-3 bg-imperial-900/60 p-4 rounded-lg border border-gold-500/30">
                              <label className="text-[11px] text-gold-300 font-bold block">
                                Provide Approved Answer for LAMO Knowledge Base:
                              </label>
                              <textarea
                                value={ownerAnswerInput}
                                onChange={(e) => setOwnerAnswerInput(e.target.value)}
                                rows={3}
                                placeholder="Enter verified response. This will be taught to LAMO for all future queries..."
                                className="w-full bg-imperial-950 border border-neutral-700 rounded p-2.5 text-xs text-white focus:outline-none focus:border-gold-500"
                              />

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
                                  Confirm & Add to Knowledge
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
                          <span className="text-[10px] text-gold-400 font-bold">{skill.suggestedProficiency}%</span>
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

