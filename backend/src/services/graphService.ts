import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';
import { ImageAnalysis } from './aiService.js';

/**
 * Normalize Neo4j datetime to ISO string for consistent serialization
 */
function normalizeDateTime(neoDateTime: any): string {
  if (!neoDateTime) return new Date().toISOString();

  // Neo4j datetime can be a Neo4j DateTime object or already a string
  if (typeof neoDateTime === 'string') return neoDateTime;
  if (neoDateTime.toString) return new Date(neoDateTime.toString()).toISOString();

  return new Date(neoDateTime).toISOString();
}

export interface Image {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  uploadedAt: Date;
  uploaderId: string;
}

export interface GraphNode {
  id: string;
  type: 'user' | 'image' | 'attribute';
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  type: 'UPLOADED' | 'HAS_ATTRIBUTE' | 'SIMILAR_TO';
  source: string;
  target: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Create image node with attributes and relationships
 */
export async function createImageWithAttributes(
  imageId: string,
  userId: string,
  url: string,
  thumbnailUrl: string,
  analysis: ImageAnalysis
): Promise<Image> {
  return await runWriteTransaction(async (tx) => {
    // Create image node and UPLOADED relationship
    const imageResult = await tx.run(
      `
      MATCH (u:User {id: $userId})
      CREATE (i:Image {
        id: $imageId,
        url: $url,
        thumbnailUrl: $thumbnailUrl,
        title: $title,
        description: $description,
        uploadedAt: datetime()
      })
      CREATE (u)-[:UPLOADED {timestamp: datetime()}]->(i)
      RETURN i
      `,
      {
        userId,
        imageId,
        url,
        thumbnailUrl,
        title: analysis.title,
        description: analysis.description,
      }
    );

    const imageNode = imageResult.records[0].get('i').properties;

    // Create or link attributes with canonical flag
    for (const attr of analysis.attributes) {
      await tx.run(
        `
        MATCH (i:Image {id: $imageId})
        MERGE (a:Attribute {type: $type, value: $value})
        CREATE (i)-[:HAS_ATTRIBUTE {confidence: $confidence, canonical: $canonical}]->(a)
        `,
        {
          imageId,
          type: attr.type,
          value: attr.value,
          confidence: attr.confidence,
          canonical: attr.canonical ?? false,
        }
      );
    }

    return {
      id: imageNode.id,
      url: imageNode.url,
      thumbnailUrl: imageNode.thumbnailUrl,
      title: imageNode.title,
      description: imageNode.description,
      uploadedAt: new Date(imageNode.uploadedAt),
      uploaderId: userId,
    };
  });
}

/**
 * Get user's ego network (their uploads + attributes + similar images)
 */
export async function getUserEgoNetwork(userId: string): Promise<GraphData> {
  return await runReadTransaction(async (tx) => {
    // Modified query to return relationship data with node IDs explicitly
    const result = await tx.run(
      `
      MATCH (u:User {id: $userId})
      OPTIONAL MATCH (u)-[uploadRel:UPLOADED]->(i:Image)
      OPTIONAL MATCH (i)-[attrRel:HAS_ATTRIBUTE]->(a:Attribute)
      OPTIONAL MATCH (i)-[simRel:SIMILAR_TO]-(similar:Image)
      OPTIONAL MATCH (similar)-[:HAS_ATTRIBUTE]->(similarAttr:Attribute)

      RETURN u,
             collect(DISTINCT i) as images,
             collect(DISTINCT a) as attributes,
             collect(DISTINCT similar) as similarImages,
             collect(DISTINCT similarAttr) as similarAttributes,
             collect(DISTINCT {imageId: i.id}) as uploadRelData,
             collect(DISTINCT {imageId: i.id, attrType: a.type, attrValue: a.value, confidence: attrRel.confidence, canonical: attrRel.canonical}) as attrRelData,
             collect(DISTINCT {img1: i.id, img2: similar.id, similarity: simRel.similarity}) as simRelData
      `,
      { userId }
    );

    if (result.records.length === 0) {
      return { nodes: [], edges: [] };
    }

    const record = result.records[0];
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    // Add user node
    const user = record.get('u');
    nodes.push({
      id: user.properties.id,
      type: 'user',
      properties: {
        id: user.properties.id,
        email: user.properties.email,
        name: user.properties.name,
        profilePictureUrl: user.properties.profilePictureUrl,
      },
    });
    nodeIds.add(user.properties.id);

    // Add image nodes (user's uploads)
    const images = record.get('images');
    images.forEach((img: any) => {
      if (img && img.properties) {
        nodes.push({
          id: img.properties.id,
          type: 'image',
          properties: {
            id: img.properties.id,
            url: img.properties.url,
            thumbnailUrl: img.properties.thumbnailUrl,
            title: img.properties.title,
            description: img.properties.description,
            uploadedAt: normalizeDateTime(img.properties.uploadedAt),
          },
        });
        nodeIds.add(img.properties.id);
      }
    });

    // Add similar images
    const similarImages = record.get('similarImages');
    similarImages.forEach((img: any) => {
      if (img && img.properties && !nodeIds.has(img.properties.id)) {
        nodes.push({
          id: img.properties.id,
          type: 'image',
          properties: {
            id: img.properties.id,
            url: img.properties.url,
            thumbnailUrl: img.properties.thumbnailUrl,
            title: img.properties.title,
            description: img.properties.description,
            uploadedAt: normalizeDateTime(img.properties.uploadedAt),
          },
        });
        nodeIds.add(img.properties.id);
      }
    });

    // Add attribute nodes
    const attributes = record.get('attributes');
    const similarAttributes = record.get('similarAttributes');
    const allAttributes = [...attributes, ...similarAttributes];

    allAttributes.forEach((attr: any) => {
      if (attr && attr.properties) {
        const nodeId = `${attr.properties.type}:${attr.properties.value}`;
        if (!nodeIds.has(nodeId)) {
          nodes.push({
            id: nodeId,
            type: 'attribute',
            properties: {
              type: attr.properties.type,
              value: attr.properties.value,
            },
          });
          nodeIds.add(nodeId);
        }
      }
    });

    // Add UPLOADED relationships from extracted data
    const uploadRelData = record.get('uploadRelData');
    uploadRelData.forEach((data: any, idx: number) => {
      if (data && data.imageId) {
        const edgeId = `upload-${userId}-${data.imageId}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({
            id: `upload-${idx}`,
            type: 'UPLOADED',
            source: userId,
            target: data.imageId,
            properties: {},
          });
          edgeIds.add(edgeId);
        }
      }
    });

    // Add HAS_ATTRIBUTE relationships from extracted data
    const attrRelData = record.get('attrRelData');
    attrRelData.forEach((data: any, idx: number) => {
      if (data && data.imageId && data.attrType && data.attrValue) {
        const targetId = `${data.attrType}:${data.attrValue}`;
        const edgeId = `attr-${data.imageId}-${targetId}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({
            id: `attr-${idx}`,
            type: 'HAS_ATTRIBUTE',
            source: data.imageId,
            target: targetId,
            properties: {
              confidence: data.confidence || 0.9,
              canonical: data.canonical ?? false,
            },
          });
          edgeIds.add(edgeId);
        }
      }
    });

    // Add SIMILAR_TO relationships from extracted data
    const simRelData = record.get('simRelData');
    simRelData.forEach((data: any, idx: number) => {
      if (data && data.img1 && data.img2) {
        const edgeId = `sim-${data.img1}-${data.img2}`;
        const reverseEdgeId = `sim-${data.img2}-${data.img1}`;
        if (!edgeIds.has(edgeId) && !edgeIds.has(reverseEdgeId)) {
          edges.push({
            id: `sim-${idx}`,
            type: 'SIMILAR_TO',
            source: data.img1,
            target: data.img2,
            properties: {
              similarity: data.similarity,
            },
          });
          edgeIds.add(edgeId);
        }
      }
    });

    return { nodes, edges };
  });
}

/**
 * Get global graph sample (paginated)
 */
export async function getGlobalGraphSample(
  limit: number = 100,
  skip: number = 0
): Promise<GraphData> {
  return await runReadTransaction(async (tx) => {
    const result = await tx.run(
      `
      MATCH (i:Image)-[attrRel:HAS_ATTRIBUTE]->(a:Attribute)
      WITH i, collect({attr: a, rel: attrRel}) as attrs
      ORDER BY i.uploadedAt DESC
      SKIP $skip
      LIMIT $limit
      MATCH (u:User)-[uploadRel:UPLOADED]->(i)
      RETURN i, u, attrs, uploadRel
      `,
      { limit, skip }
    );

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIds = new Set<string>();

    result.records.forEach((record: any, recordIdx: number) => {
      const img = record.get('i');
      const user = record.get('u');
      const attrs = record.get('attrs');
      const uploadRel = record.get('uploadRel');

      // Add user node
      if (user && user.properties && !nodeIds.has(user.properties.id)) {
        nodes.push({
          id: user.properties.id,
          type: 'user',
          properties: {
            id: user.properties.id,
            email: user.properties.email,
            name: user.properties.name,
            profilePictureUrl: user.properties.profilePictureUrl,
          },
        });
        nodeIds.add(user.properties.id);
      }

      // Add image node
      if (img && img.properties && !nodeIds.has(img.properties.id)) {
        nodes.push({
          id: img.properties.id,
          type: 'image',
          properties: {
            id: img.properties.id,
            url: img.properties.url,
            thumbnailUrl: img.properties.thumbnailUrl,
            title: img.properties.title,
            description: img.properties.description,
            uploadedAt: normalizeDateTime(img.properties.uploadedAt),
          },
        });
        nodeIds.add(img.properties.id);
      }

      // Add upload relationship
      if (uploadRel && user && img) {
        edges.push({
          id: `upload-${recordIdx}`,
          type: 'UPLOADED',
          source: user.properties.id,
          target: img.properties.id,
          properties: {},
        });
      }

      // Add attribute nodes and relationships
      if (attrs && Array.isArray(attrs)) {
        attrs.forEach((attrData: any, attrIdx: number) => {
          if (attrData && attrData.attr && attrData.attr.properties) {
            const attr = attrData.attr;
            const nodeId = `${attr.properties.type}:${attr.properties.value}`;

            if (!nodeIds.has(nodeId)) {
              nodes.push({
                id: nodeId,
                type: 'attribute',
                properties: {
                  type: attr.properties.type,
                  value: attr.properties.value,
                },
              });
              nodeIds.add(nodeId);
            }

            edges.push({
              id: `attr-${recordIdx}-${attrIdx}`,
              type: 'HAS_ATTRIBUTE',
              source: img.properties.id,
              target: nodeId,
              properties: {
                confidence: attrData.rel?.properties?.confidence || 0.9,
                canonical: attrData.rel?.properties?.canonical ?? false,
              },
            });
          }
        });
      }
    });

    return { nodes, edges };
  });
}
