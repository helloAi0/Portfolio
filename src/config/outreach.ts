/**
 * Facts used in cold emails. Only the owner's own stated project descriptions; edit here, never invented elsewhere.
 * `words` pick the project that best matches what the recipient works on.
 */
export interface OutreachProject { key: string; name: string; fact: string; words: string[] }
export const OUTREACH_PROJECTS: OutreachProject[] = [
  { key: 'flow', name: 'Decoupled Latent Flow Matching for Bimanual Spatial Trajectories in Agentic World Models', fact: 'research on bimanual spatial trajectories with latent flow matching in agentic world models',
    words: ['robot', 'embodied', 'manipulat', 'world model', 'flow matching', 'trajector', 'agent', 'bimanual', 'imitation', 'diffusion', 'policy', 'vision'] },
  { key: 'pinn', name: 'PinnFlow', fact: 'physics-informed reconstruction of unsteady incompressible flow',
    words: ['physics', 'fluid', 'flow', 'pinn', 'simulation', 'scientific', 'pde', 'numerical', 'cfd', 'dynamics', 'neural operator'] },
  { key: 'shadow', name: 'Project Shadow-Net', fact: 'a multi-hop offline payment protocol using BLE beacons, Wi-Fi Direct, zero-knowledge proofs and ARM TrustZone',
    words: ['security', 'crypto', 'systems', 'network', 'c++', 'embedded', 'privacy', 'zero-knowledge', 'zkp', 'trust', 'protocol', 'payment', 'linux', 'kernel'] },
];
export const OUTREACH_DEFAULT = OUTREACH_PROJECTS[0];
export const MAX_WORDS = 150;
