// Graph Starz - Neo4j Database Initialization Script
// Run this script in Neo4j Browser to set up the database schema

// ============================================
// CONSTRAINTS & INDEXES
// ============================================

// User constraints
CREATE CONSTRAINT user_email_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.id IS UNIQUE;

// Image constraints
CREATE CONSTRAINT image_id_unique IF NOT EXISTS
  FOR (i:Image) REQUIRE i.id IS UNIQUE;

// Constellation constraints (for future use)
CREATE CONSTRAINT constellation_id_unique IF NOT EXISTS
  FOR (c:Constellation) REQUIRE c.id IS UNIQUE;

// ============================================
// INDEXES
// ============================================

// Attribute lookup indexes
CREATE INDEX attribute_type_value IF NOT EXISTS
  FOR (a:Attribute) ON (a.type, a.value);

CREATE INDEX attribute_type IF NOT EXISTS
  FOR (a:Attribute) ON (a.type);

CREATE INDEX attribute_value IF NOT EXISTS
  FOR (a:Attribute) ON (a.value);

// User indexes
CREATE INDEX user_email IF NOT EXISTS
  FOR (u:User) ON (u.email);

CREATE INDEX user_created_at IF NOT EXISTS
  FOR (u:User) ON (u.createdAt);

// Image indexes
CREATE INDEX image_uploaded_at IF NOT EXISTS
  FOR (i:Image) ON (i.uploadedAt);

CREATE INDEX image_title IF NOT EXISTS
  FOR (i:Image) ON (i.title);

// Relationship indexes for performance
CREATE INDEX uploaded_timestamp IF NOT EXISTS
  FOR ()-[r:UPLOADED]->() ON (r.timestamp);

CREATE INDEX has_attribute_confidence IF NOT EXISTS
  FOR ()-[r:HAS_ATTRIBUTE]->() ON (r.confidence);

CREATE INDEX similar_to_similarity IF NOT EXISTS
  FOR ()-[r:SIMILAR_TO]->() ON (r.similarity);

// ============================================
// VERIFY SCHEMA
// ============================================

// Show all constraints (run this to verify)
SHOW CONSTRAINTS;

// Show all indexes (run this to verify)
SHOW INDEXES;

// ============================================
// SAMPLE VERIFICATION QUERY
// ============================================

// This query verifies the schema is ready
RETURN {
  message: "Graph Starz Neo4j database initialized successfully!",
  timestamp: datetime(),
  constraints: size([ c IN db.constraints() | c ]),
  indexes: size([ i IN db.indexes() | i ]),
  ready: true
} as status;