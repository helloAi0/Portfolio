import fs from 'fs';
import path from 'path';
import { modelInfoFromDmmf, type ModelInfo } from './backup';

type DmmfLikeModel = { name: string; fields: Array<{ name: string; type: string; kind: string; relationFromFields?: string[] }> };

/** Reads model/field info straight from a .prisma file (no generated client needed). */
export function parseSchemaModels(schemaText: string): DmmfLikeModel[] {
  const modelNames = Array.from(schemaText.matchAll(/^model\s+(\w+)\s*\{/gm)).map((m) => m[1]);
  const models: DmmfLikeModel[] = [];
  for (const m of Array.from(schemaText.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm))) {
    const fields: DmmfLikeModel['fields'] = [];
    for (const raw of m[2].split('\n')) {
      const line = raw.replace(/\/\/.*$/, '').trim();
      const f = line.match(/^(\w+)\s+(\w+)(\[\])?(\?)?(\s|$)/);
      if (!f || line.startsWith('@@')) continue;
      const [, name, type] = f;
      const isRelation = modelNames.includes(type);
      fields.push({ name, type, kind: isRelation ? 'object' : 'scalar', relationFromFields: isRelation && /@relation\([^)]*fields:\s*\[/.test(line) ? ['fk'] : [] });
    }
    models.push({ name: m[1], fields });
  }
  return models;
}

/** Prefer the generated client's metadata; fall back to the schema file so backups never depend on it. */
export function loadModelInfo(prismaNamespace?: unknown): ModelInfo[] {
  const fromClient = (prismaNamespace as any)?.dmmf?.datamodel?.models;
  if (Array.isArray(fromClient) && fromClient.length) return modelInfoFromDmmf(fromClient);
  const file = path.join(process.cwd(), 'prisma', 'schema.prisma');
  return modelInfoFromDmmf(parseSchemaModels(fs.readFileSync(file, 'utf8')));
}
