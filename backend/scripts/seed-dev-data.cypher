// Graph Starz - Development Seed Data
// Run this script in Neo4j Browser to populate sample data for development

// ============================================
// CLEAR EXISTING DATA (OPTIONAL - UNCOMMENT IF NEEDED)
// ============================================

// WARNING: This will delete ALL data in your database!
// MATCH (n) DETACH DELETE n;

// ============================================
// CREATE USERS
// ============================================

MERGE (alice:User {
  id: 'user_alice_demo',
  email: 'alice@graphstarz.dev',
  name: 'Alice Chen',
  profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
  createdAt: datetime('2024-01-15T10:30:00')
})

MERGE (bob:User {
  id: 'user_bob_demo',
  email: 'bob@graphstarz.dev',
  name: 'Bob Martinez',
  profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
  createdAt: datetime('2024-01-16T14:20:00')
})

MERGE (carol:User {
  id: 'user_carol_demo',
  email: 'carol@graphstarz.dev',
  name: 'Carol Williams',
  profilePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
  createdAt: datetime('2024-01-17T09:15:00')
});

// ============================================
// CREATE ATTRIBUTES
// ============================================

// Style attributes
MERGE (style_cyberpunk:Attribute {type: 'style', value: 'cyberpunk'})
MERGE (style_minimalist:Attribute {type: 'style', value: 'minimalist'})
MERGE (style_abstract:Attribute {type: 'style', value: 'abstract'})
MERGE (style_photographic:Attribute {type: 'style', value: 'photographic'})

// Mood attributes
MERGE (mood_energetic:Attribute {type: 'mood', value: 'energetic'})
MERGE (mood_peaceful:Attribute {type: 'mood', value: 'peaceful'})
MERGE (mood_mysterious:Attribute {type: 'mood', value: 'mysterious'})
MERGE (mood_dramatic:Attribute {type: 'mood', value: 'dramatic'})

// Subject attributes
MERGE (subject_cityscape:Attribute {type: 'subject', value: 'cityscape'})
MERGE (subject_nature:Attribute {type: 'subject', value: 'nature'})
MERGE (subject_portrait:Attribute {type: 'subject', value: 'portrait'})
MERGE (subject_abstract:Attribute {type: 'subject', value: 'abstract_art'})

// Color attributes
MERGE (color_neon:Attribute {type: 'color', value: 'neon'})
MERGE (color_monochrome:Attribute {type: 'color', value: 'monochrome'})
MERGE (color_warm:Attribute {type: 'color', value: 'warm_tones'})
MERGE (color_cool:Attribute {type: 'color', value: 'cool_tones'});

// ============================================
// CREATE IMAGES AND RELATIONSHIPS
// ============================================

// Alice's images
MERGE (img1:Image {
  id: 'img_001_neon_city',
  title: 'Neon Dreams',
  description: 'A futuristic cityscape bathed in neon lights, reflecting the cyberpunk aesthetic of tomorrow',
  url: 'https://picsum.photos/seed/neon1/800/600',
  thumbnailUrl: 'https://picsum.photos/seed/neon1/200/150',
  uploadedAt: datetime('2024-01-20T18:45:00')
})

MERGE (alice)-[:UPLOADED {timestamp: datetime('2024-01-20T18:45:00')}]->(img1)
MERGE (img1)-[:HAS_ATTRIBUTE {confidence: 0.95}]->(style_cyberpunk)
MERGE (img1)-[:HAS_ATTRIBUTE {confidence: 0.88}]->(mood_energetic)
MERGE (img1)-[:HAS_ATTRIBUTE {confidence: 0.92}]->(subject_cityscape)
MERGE (img1)-[:HAS_ATTRIBUTE {confidence: 0.90}]->(color_neon)

MERGE (img2:Image {
  id: 'img_002_zen_garden',
  title: 'Tranquil Spaces',
  description: 'A minimalist composition capturing the essence of calm and simplicity',
  url: 'https://picsum.photos/seed/zen1/800/600',
  thumbnailUrl: 'https://picsum.photos/seed/zen1/200/150',
  uploadedAt: datetime('2024-01-22T10:15:00')
})

MERGE (alice)-[:UPLOADED {timestamp: datetime('2024-01-22T10:15:00')}]->(img2)
MERGE (img2)-[:HAS_ATTRIBUTE {confidence: 0.93}]->(style_minimalist)
MERGE (img2)-[:HAS_ATTRIBUTE {confidence: 0.96}]->(mood_peaceful)
MERGE (img2)-[:HAS_ATTRIBUTE {confidence: 0.87}]->(subject_nature)
MERGE (img2)-[:HAS_ATTRIBUTE {confidence: 0.85}]->(color_monochrome)

// Bob's images
MERGE (img3:Image {
  id: 'img_003_abstract_flow',
  title: 'Fluid Dynamics',
  description: 'Abstract patterns that flow and merge, creating a sense of movement and energy',
  url: 'https://picsum.photos/seed/abstract1/800/600',
  thumbnailUrl: 'https://picsum.photos/seed/abstract1/200/150',
  uploadedAt: datetime('2024-01-23T15:30:00')
})

MERGE (bob)-[:UPLOADED {timestamp: datetime('2024-01-23T15:30:00')}]->(img3)
MERGE (img3)-[:HAS_ATTRIBUTE {confidence: 0.97}]->(style_abstract)
MERGE (img3)-[:HAS_ATTRIBUTE {confidence: 0.85}]->(mood_mysterious)
MERGE (img3)-[:HAS_ATTRIBUTE {confidence: 0.94}]->(subject_abstract)
MERGE (img3)-[:HAS_ATTRIBUTE {confidence: 0.88}]->(color_cool)

MERGE (img4:Image {
  id: 'img_004_urban_portrait',
  title: 'Street Stories',
  description: 'A dramatic urban portrait capturing the essence of city life',
  url: 'https://picsum.photos/seed/portrait1/800/600',
  thumbnailUrl: 'https://picsum.photos/seed/portrait1/200/150',
  uploadedAt: datetime('2024-01-24T20:00:00')
})

MERGE (bob)-[:UPLOADED {timestamp: datetime('2024-01-24T20:00:00')}]->(img4)
MERGE (img4)-[:HAS_ATTRIBUTE {confidence: 0.91}]->(style_photographic)
MERGE (img4)-[:HAS_ATTRIBUTE {confidence: 0.89}]->(mood_dramatic)
MERGE (img4)-[:HAS_ATTRIBUTE {confidence: 0.95}]->(subject_portrait)
MERGE (img4)-[:HAS_ATTRIBUTE {confidence: 0.82}]->(color_warm)

// Carol's images
MERGE (img5:Image {
  id: 'img_005_cyber_portrait',
  title: 'Digital Identity',
  description: 'A fusion of human and digital, exploring identity in the cyber age',
  url: 'https://picsum.photos/seed/cyber1/800/600',
  thumbnailUrl: 'https://picsum.photos/seed/cyber1/200/150',
  uploadedAt: datetime('2024-01-25T11:45:00')
})

MERGE (carol)-[:UPLOADED {timestamp: datetime('2024-01-25T11:45:00')}]->(img5)
MERGE (img5)-[:HAS_ATTRIBUTE {confidence: 0.92}]->(style_cyberpunk)
MERGE (img5)-[:HAS_ATTRIBUTE {confidence: 0.87}]->(mood_mysterious)
MERGE (img5)-[:HAS_ATTRIBUTE {confidence: 0.90}]->(subject_portrait)
MERGE (img5)-[:HAS_ATTRIBUTE {confidence: 0.93}]->(color_neon);

// ============================================
// CREATE SIMILARITY RELATIONSHIPS
// ============================================

// Images with cyberpunk style are similar
MERGE (img1)-[:SIMILAR_TO {similarity: 0.85}]->(img5)
MERGE (img5)-[:SIMILAR_TO {similarity: 0.85}]->(img1)

// Images with portrait subjects are similar
MERGE (img4)-[:SIMILAR_TO {similarity: 0.78}]->(img5)
MERGE (img5)-[:SIMILAR_TO {similarity: 0.78}]->(img4);

// ============================================
// CREATE A SAMPLE CONSTELLATION (Future Feature)
// ============================================

MERGE (constellation1:Constellation {
  id: 'const_001_cyberpunk_collection',
  name: 'Cyberpunk Visions',
  description: 'A curated collection of cyberpunk-inspired imagery',
  createdAt: datetime('2024-01-26T16:00:00')
})

MERGE (alice)-[:CREATED {timestamp: datetime('2024-01-26T16:00:00')}]->(constellation1)
MERGE (constellation1)-[:INCLUDES {addedAt: datetime('2024-01-26T16:01:00')}]->(img1)
MERGE (constellation1)-[:INCLUDES {addedAt: datetime('2024-01-26T16:02:00')}]->(img5);

// ============================================
// VERIFICATION QUERIES
// ============================================

// Count entities
MATCH (u:User) WITH count(u) as userCount
MATCH (i:Image) WITH userCount, count(i) as imageCount
MATCH (a:Attribute) WITH userCount, imageCount, count(a) as attrCount
MATCH (c:Constellation) WITH userCount, imageCount, attrCount, count(c) as constCount
RETURN {
  message: "Seed data loaded successfully!",
  users: userCount,
  images: imageCount,
  attributes: attrCount,
  constellations: constCount,
  timestamp: datetime()
} as summary;

// Sample query to visualize the graph (run separately)
// MATCH (u:User)-[r1:UPLOADED]->(i:Image)-[r2:HAS_ATTRIBUTE]->(a:Attribute)
// RETURN u, r1, i, r2, a LIMIT 50;