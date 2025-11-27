import { runWriteTransaction, runReadTransaction } from '../config/neo4j.js';
import { ImageAnalysis } from './aiService.js';

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

    // Create or link attributes
    for (const attr of analysis.attributes) {
      await tx.run(
        `
        MATCH (i:Image {id: $imageId})
        MERGE (a:Attribute {type: $type, value: $value})
        CREATE (i)-[:HAS_ATTRIBUTE {confidence: $confidence}]->(a)
        `,
        {
          imageId,
          type: attr.type,
          value: attr.value,
          confidence: attr.confidence,
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
             collect(DISTINCT uploadRel) as uploadRels,
             collect(DISTINCT attrRel) as attrRels,
             collect(DISTINCT simRel) as simRels
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
            uploadedAt: img.properties.uploadedAt,
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
            uploadedAt: img.properties.uploadedAt,
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

    // Add UPLOADED relationships
    const uploadRels = record.get('uploadRels');
    uploadRels.forEach((rel: any, idx: number) => {
      if (rel && rel.end && rel.end.properties) {
        edges.push({
          id: `upload-${idx}`,
          type: 'UPLOADED',
          source: userId,
          target: rel.end.properties.id,
          properties: {},
        });
      }
    });

    // Add HAS_ATTRIBUTE relationships
    const attrRels = record.get('attrRels');
    attrRels.forEach((rel: any, idx: number) => {
      if (rel && rel.start && rel.end && rel.start.properties && rel.end.properties) {
        edges.push({
          id: `attr-${idx}`,
          type: 'HAS_ATTRIBUTE',
          source: rel.start.properties.id,
          target: `${rel.end.properties.type}:${rel.end.properties.value}`,
          properties: {
            confidence: rel.properties.confidence,
          },
        });
      }
    });

    // Add SIMILAR_TO relationships
    const simRels = record.get('simRels');
    simRels.forEach((rel: any, idx: number) => {
      if (rel && rel.start && rel.end && rel.start.properties && rel.end.properties) {
        edges.push({
          id: `sim-${idx}`,
          type: 'SIMILAR_TO',
          source: rel.start.properties.id,
          target: rel.end.properties.id,
          properties: {
            similarity: rel.properties.similarity,
          },
        });
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
            uploadedAt: img.properties.uploadedAt,
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
              },
            });
          }
        });
      }
    });

    return { nodes, edges };
  });
}
