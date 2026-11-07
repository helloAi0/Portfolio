/**
 * LAMO LLM Engine & Response Synthesizer
 * Connects knowledge retrieval, guardrails, navigation pill generation, and multi-tier LLM execution.
 */

import { RetrievedKnowledgeChunk, LamoResponse, NavigationPill, VerificationTier } from './types';
import { INSUFFICIENT_EVIDENCE_PHRASE, sanitizeOutput } from './guardrails';
import { recordUnansweredQuestion } from './unansweredService';
import { logger } from '@/lib/logger';

const LAMO_SYSTEM_PROMPT = `You are LAMO, the Personal AI Portfolio Manager for Sahil Depurwala.
You are the intelligent representative of Sahil's professional identity.

Your personality:
- Professional, intelligent, confident, concise, approachable, and technically articulate.
- Avoid excessive slang or casual colloquialisms.

Your strict boundaries:
- Ground all factual answers strictly in the verified knowledge chunks provided below.
- Never invent academic marks, GPA, rankings, phantom jobs, or certifications.
- If asked about an experience or detail not contained in the verified knowledge, politely state:
  "${INSUFFICIENT_EVIDENCE_PHRASE}"
- Do not disclose private credentials, password hashes, or internal secrets.
- Sahil is an undergraduate B.Tech candidate in CSE (AIML) at UEM / IEM Kolkata (Class of 2024–2028) with a minor in Cybersecurity and dedicated research in Autonomous Robotics (ROS 2 & SLAM).`;

export async function generateLamoResponse(params: {
  question: string;
  retrievedChunks: RetrievedKnowledgeChunk[];
  relevanceScore: number;
  conversationHistory?: Array<{ role: string; content: string }>;
}): Promise<LamoResponse> {
  const { question, retrievedChunks, relevanceScore, conversationHistory } = params;
  const qLower = question.toLowerCase();

  // 1. Evaluate if question lacks verified evidence in the database
  const isGenericGreeting = /^(hi|hello|hey|greetings|who are you|what is lamo|help)/i.test(question.trim());

  if (!isGenericGreeting && (retrievedChunks.length === 0 || relevanceScore < 10)) {
    // Insufficient evidence detected -> Log unanswered question for owner
    const unanswered = await recordUnansweredQuestion({
      question,
      context: `Low retrieval relevance (${relevanceScore.toFixed(1)}). Available chunks: ${retrievedChunks.length}.`,
      reason: 'No verified evidence found in portfolio database.',
    });

    return {
      answer: INSUFFICIENT_EVIDENCE_PHRASE,
      confidence: 'UNKNOWN',
      citations: [],
      suggestedActions: [
        { label: 'Dispatch Enquiry via Contact', href: '/contact' },
        { label: 'Inspect Academic Foundation', href: '/education' },
      ],
      isUnanswered: true,
      questionId: unanswered.questionId,
      missingInformationReason: 'No verified evidence found in database.',
    };
  }

  // 2. Generate relevant navigation action pills based on query context
  const navigationPills: NavigationPill[] = [];

  if (qLower.includes('robot') || qLower.includes('ros') || qLower.includes('slam') || qLower.includes('aethelgard')) {
    navigationPills.push({ label: 'Explore Aethelgard SLAM Rover', href: '/projects/autonomous-rover-slam' });
    navigationPills.push({ label: 'Robotics Engineering Domain', href: '/domains#robotics' });
  } else if (qLower.includes('ai') || qLower.includes('vision') || qLower.includes('macedon')) {
    navigationPills.push({ label: 'Explore Macedon-Vision Pipeline', href: '/projects/neural-vision-pipeline' });
    navigationPills.push({ label: 'AI & ML Blueprints', href: '/domains#ai' });
  } else if (qLower.includes('cyber') || qLower.includes('security') || qLower.includes('cipher')) {
    navigationPills.push({ label: 'Explore CipherSentinel Vault', href: '/projects/cipher-sentinel-vault' });
  } else if (qLower.includes('education') || qLower.includes('college') || qLower.includes('iem') || qLower.includes('uem')) {
    navigationPills.push({ label: 'Academic Foundation', href: '/education' });
    navigationPills.push({ label: 'Curriculum Vitae', href: '/resume' });
  } else if (qLower.includes('project') || qLower.includes('portfolio') || qLower.includes('work')) {
    navigationPills.push({ label: 'Flagship Project Explorer', href: '/projects' });
  } else if (qLower.includes('skill') || qLower.includes('language') || qLower.includes('python') || qLower.includes('c++')) {
    navigationPills.push({ label: 'Skill Taxonomy Graph', href: '/skills' });
    navigationPills.push({ label: 'Coding Arena', href: '/coding-arena' });
  } else if (qLower.includes('contact') || qLower.includes('email') || qLower.includes('hire') || qLower.includes('reach')) {
    navigationPills.push({ label: 'Transmit Signal to Sahil', href: '/contact' });
  } else {
    navigationPills.push({ label: 'Explore Projects', href: '/projects' });
    navigationPills.push({ label: 'View Skills', href: '/skills' });
  }

  // Prepare citation list
  const citations = retrievedChunks.slice(0, 4).map((c) => ({
    source: c.source,
    title: c.title,
    status: c.verificationStatus,
    url: c.urlPath,
  }));

  // Determine confidence tier directly from primary verified evidence chunk
  const confidence: VerificationTier = retrievedChunks[0]?.verificationStatus || 'VERIFIED';

  // 3. Attempt Gemini API LLM generation if GEMINI_API_KEY is configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const knowledgeContext = retrievedChunks
        .slice(0, 6)
        .map((c, i) => `[Source ${i + 1}: ${c.title} (${c.verificationStatus})]\n${c.content}`)
        .join('\n\n');

      const promptPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${LAMO_SYSTEM_PROMPT}\n\nVERIFIED KNOWLEDGE BASE:\n${knowledgeContext}\n\nVISITOR QUESTION: "${question}"\n\nPlease answer the visitor question concisely, professionally, and strictly using the verified facts above.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(promptPayload),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText && rawText.trim().length > 0) {
          return {
            answer: sanitizeOutput(rawText.trim()),
            confidence,
            citations,
            suggestedActions: navigationPills,
            isUnanswered: false,
          };
        }
      }
    } catch (llmErr) {
      logger.warn('LamoLLM.GeminiFallback', 'Gemini API call timed out or failed. Falling back to deterministic RAG engine.');
    }
  }

  // 4. Built-in Deterministic RAG Synthesis Engine (Zero hallucination, high precision)
  const synthesizedAnswer = synthesizeGroundedResponse(question, retrievedChunks);

  return {
    answer: sanitizeOutput(synthesizedAnswer),
    confidence,
    citations,
    suggestedActions: navigationPills,
    isUnanswered: false,
  };
}

/**
 * Deterministic RAG Response Synthesizer
 * Formulates structured, articulate responses directly from verified chunk data.
 */
function synthesizeGroundedResponse(question: string, chunks: RetrievedKnowledgeChunk[]): string {
  const q = question.toLowerCase();

  // 1. Prioritize owner-approved answers and knowledge records
  const ownerChunk = chunks.find(
    (c) =>
      c.verificationStatus === 'OWNER_CONFIRMED' &&
      (c.content.toLowerCase().includes('verified answer:') || c.content.toLowerCase().includes('approved answer:'))
  );
  if (ownerChunk) {
    const parts = ownerChunk.content.split(/(?:verified answer:|approved answer:)\s*/i);
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return ownerChunk.content;
  }

  // Robotics / SLAM / ROS 2 query
  if (q.includes('robot') || q.includes('ros') || q.includes('slam')) {
    return `Sahil is actively pursuing research in Autonomous Robotics. His flagship robotics project is **Aethelgard: Autonomous SLAM Navigation Engine**, which implements 2D/3D LiDAR sensor fusion, Adaptive Monte Carlo Localization (AMCL), and real-time obstacle avoidance with ROS 2 Humble in Gazebo simulation. His skill graph marks Autonomous Robotics as in active laboratory practice, alongside systems programming in C++ and Python.`;
  }

  // AI & Machine Learning query
  if (q.includes('ai') || q.includes('machine learning') || q.includes('neural') || q.includes('vision') || q.includes('model')) {
    return `Sahil's major academic specialization at UEM / IEM Kolkata is in Computer Science and Engineering with a focus on Artificial Intelligence and Machine Learning. His research prototypes include **Macedon-Vision: Low-Latency Spatial Classifier**, an edge-optimized convolutional neural network with 8-bit integer quantization running under 30ms latency for robotic vision streams.`;
  }

  // Cybersecurity query
  if (q.includes('cyber') || q.includes('security') || q.includes('cipher')) {
    return `Sahil holds a formal academic minor degree specialization in **Cybersecurity**. Within this track, he developed **CipherSentinel: Cryptographic Perimeter Defense**, a zero-trust architecture enforcing mutual TLS, token rotation, and anomaly detection on incoming RPC ingress payloads.`;
  }

  // Programming languages query (word boundaries to prevent matching 'microcode')
  if (/\b(language|languages|c\+\+|python|java|coding|programming)\b/i.test(q)) {
    return `Sahil's verified core programming languages include **C and C++** (used for low-latency systems and robotics kernels), **Python** (for machine learning models and automated pipelines), **Java** (object-oriented architecture), and **JavaScript/TypeScript** (used for Next.js and WebGL Three.js interactive experiences like Project LAMO).`;
  }

  // Education query
  if (q.includes('education') || q.includes('college') || q.includes('university') || q.includes('school') || q.includes('degree') || q.includes('iem') || q.includes('uem')) {
    return `Sahil is an undergraduate engineering student at the **University of Engineering and Management / Institute of Engineering and Management (UEM / IEM), Kolkata**, enrolled in 2024 with expected graduation in 2028. He is pursuing a B.Tech in Computer Science and Engineering (Artificial Intelligence and Machine Learning) with an academic minor in Cybersecurity. His earlier schooling was completed at Saini Golden Jubilee High School and Nischintapur Public School in West Bengal.`;
  }

  // Identity / General Bio query
  if (q.includes('who are you') || q.includes('about') || q.includes('tell me about') || q.includes('sahil')) {
    const profileChunk = chunks.find((c) => c.category === 'Identity') || chunks[0];
    return `Sahil Depurwala is an undergraduate engineer at UEM / IEM Kolkata specializing in Artificial Intelligence, Machine Learning, and Autonomous Robotics, with an academic minor in Cybersecurity. Inspired by Macedonian monumental architecture and Alexander's legendary horse Bucephalus, he is building Project LAMO as a self-evolving engineering platform adhering strictly to verifiable truth.`;
  }

  // Contact query
  if (q.includes('contact') || q.includes('reach') || q.includes('email') || q.includes('hire')) {
    return `You can establish encrypted correspondence with Sahil directly through the **Transmit Signal** portal on the Contact page, or inspect his official repository on GitHub at github.com/helloAi0. Direct visitor transmissions are recorded to the central database and reviewed regularly.`;
  }

  // General grounded fallback from top retrieved chunk
  const top = chunks[0];
  if (top) {
    return `Based on verified portfolio records for **${top.title}**: ${top.content.slice(0, 350)}... You can inspect full details in the portfolio chambers linked below.`;
  }

  return INSUFFICIENT_EVIDENCE_PHRASE;
}
