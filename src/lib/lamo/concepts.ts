/**
 * Short, accurate explanations of ideas in the owner's fields. Used when the language model is unavailable, and as the safe fallback when
 * a model's "general knowledge" section is rejected. These explain IDEAS only; they never say anything about the owner.
 * `related` are search words used to find his verified work that touches the idea.
 */
export interface Concept { name: string; match: RegExp; text: string; related: string[] }

export const CONCEPTS: Concept[] = [
  { name: 'quantum computing', match: /\bquantum( comput\w*)?\b|\bqubits?\b/i, related: ['cryptography', 'linear algebra', 'machine learning', 'physics'],
    text: "Quantum computing uses qubits instead of ordinary bits. A qubit can be in a blend of 0 and 1 (superposition), and qubits can be entangled so their states are linked. Quantum algorithms use interference to make the right answers more likely, which gives big speed-ups for a few specific problems, such as factoring large numbers (Shor's algorithm), searching (Grover's algorithm) and simulating molecules. It is not a faster version of everything, and today's machines are still small and noisy." },
  { name: 'machine learning', match: /\bmachine learning\b|\bml\b/i, related: ['machine learning', 'python', 'pytorch'],
    text: "Machine learning is building programs that learn patterns from data instead of following hand-written rules. You choose a model, show it many examples, and an optimisation method (usually gradient descent) adjusts its parameters to reduce its errors. It comes in three main flavours: supervised (learn from labelled examples), unsupervised (find structure in unlabelled data) and reinforcement learning (learn from rewards)." },
  { name: 'deep learning', match: /\bdeep learning\b|\bneural networks?\b/i, related: ['deep learning', 'pytorch', 'neural'],
    text: "Deep learning is machine learning with many-layered neural networks that learn useful features directly from raw data such as images, audio or text. It powers modern vision, speech and language systems. The networks are trained with backpropagation, which needs a lot of data and compute but removes much of the hand-crafting older methods needed." },
  { name: 'reinforcement learning', match: /\breinforcement learning\b|\brl\b/i, related: ['reinforcement', 'robotics', 'agent'],
    text: "In reinforcement learning an agent acts in an environment, receives rewards, and learns a policy that maximises its total reward over time. It is used for games, robot control and decision-making. The hard parts are needing lots of trial and error, and designing rewards that encourage what you really want." },
  { name: 'robotics and embodied AI', match: /\brobotics?\b|\bembodied( ai)?\b|\brobots?\b/i, related: ['robotics', 'embodied', 'flow matching', 'bimanual'],
    text: "Robotics combines mechanics, sensing, control and software so machines can act in the physical world. Embodied AI focuses on learning systems that perceive and act through a body, such as a robot arm, which means dealing with real physics, sensor noise and safety rather than clean simulated data." },
  { name: 'flow matching', match: /\bflow matching\b/i, related: ['flow matching', 'generative', 'robotics'],
    text: "Flow matching is a way to train generative models. Instead of denoising step by step like classic diffusion, it learns a velocity field that smoothly carries simple random noise to the target data distribution. Training is simple and sampling can be fast, which is why it is popular for images and for generating robot motions." },
  { name: 'physics-informed neural networks', match: /\bpinns?\b|\bphysics[- ]informed\b/i, related: ['physics', 'pinnflow', 'flow'],
    text: "Physics-informed neural networks (PINNs) are networks trained so their outputs obey known physical laws, written as differential equations, as well as matching measured data. That helps when data is sparse, for example reconstructing a fluid flow from a few measurements." },
  { name: 'world models', match: /\bworld models?\b/i, related: ['world model', 'robotics', 'agent'],
    text: "A world model is a learned internal model of how an environment changes when an agent acts. With it, an agent can imagine outcomes and plan ahead instead of learning only by trial and error in the real world." },
  { name: 'transformers and LLMs', match: /\btransformers?\b|\bllms?\b|\blarge language models?\b|\bgenerative ai\b|\bgenai\b|\bchatgpt\b/i, related: ['nlp', 'generative', 'llm', 'transformers'],
    text: "Transformers are neural networks built on attention, which lets every token in a sequence weigh its relationship to every other token. Large language models are transformers trained on huge amounts of text to predict the next token. That simple objective ends up teaching them grammar, facts and reasoning patterns, which is why they can write, summarise and answer questions." },
  { name: 'natural language processing', match: /\bnlp\b|\bnatural language\b|\bnamed entity\b|\bner\b/i, related: ['nlp', 'ner', 'language'],
    text: "Natural language processing (NLP) is about getting computers to work with human language: classifying text, translating, summarising, answering questions, or tagging entities such as names and places (named entity recognition). Modern NLP is dominated by transformer models." },
  { name: 'computer vision', match: /\bcomputer vision\b|\bimage recognition\b/i, related: ['computer vision', 'deep learning', 'opencv'],
    text: "Computer vision teaches machines to understand images and video: recognising objects, locating them, tracking motion and estimating depth. Convolutional networks and, more recently, vision transformers do most of the heavy lifting." },
  { name: 'cryptography', match: /\bcryptograph\w*\b|\bencryption\b|\bhashing\b/i, related: ['cryptography', 'security', 'cybersecurity'],
    text: "Cryptography protects information with mathematics. Encryption keeps data secret, hashing fingerprints data so changes are detectable, digital signatures prove who sent something, and key exchange lets two strangers agree on a secret over an open network." },
  { name: 'zero-knowledge proofs', match: /\bzero[- ]knowledge\b|\bzkps?\b|\bzk[- ]?snarks?\b/i, related: ['zero-knowledge', 'cryptography', 'shadow-net', 'payment'],
    text: "A zero-knowledge proof lets you convince someone that a statement is true without revealing why it is true. For example, you can prove you know a password, or that a payment is valid, without ever sending the password or the payment details." },
  { name: 'cybersecurity', match: /\bcyber ?security\b|\binfosec\b|\bpenetration testing\b|\bpentest\w*\b/i, related: ['cybersecurity', 'security', 'cryptography'],
    text: "Cybersecurity is protecting systems, networks and data from attack. It covers prevention (secure design, encryption, access control), detection (monitoring, logging) and response (containing and recovering from incidents). A good habit is to assume parts of a system will be compromised and limit the damage." },
  { name: 'C++ and systems programming', match: /\bc\+\+|\bsystems programming\b|\bmemory management\b/i, related: ['c++', 'linux', 'systems'],
    text: "C++ is a compiled language that gives direct control over memory and performance, which is why it is used for operating systems, game engines, robotics software and anything latency-sensitive. The price is that you manage resources carefully, which modern C++ (smart pointers, RAII) makes much safer." },
];

export function findConcept(topic: string): Concept | null {
  return CONCEPTS.find((c) => c.match.test(topic)) ?? null;
}
